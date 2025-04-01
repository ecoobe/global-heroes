class GameClient {
    constructor() {
        this.log('Инициализация клиента...');
        
        // Инициализация сокета
        this.socket = this.initSocket();
        this.heroes = [];
        this.selectedHeroes = new Set();

        // DOM элементы
        this.statusEl = document.getElementById('connection-status');
        this.startButton = document.getElementById('startPve');
        this.heroSelectEl = document.getElementById('heroSelect');

        this.initEventListeners();
        this.loadHeroes();
    }

    initSocket() {
        this.log('Установка соединения WebSocket');
        const socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        // Обработчики событий сокета
        socket.on('connect', () => {
            this.log('Соединение установлено', `ID: ${socket.id}`);
            this.updateConnectionStatus(true);
        });

        socket.on('disconnect', (reason) => {
            this.log('Соединение прервано', `Причина: ${reason}`);
            this.updateConnectionStatus(false);
        });

        socket.on('connect_error', (err) => {
            this.error('Ошибка соединения', err);
            this.updateConnectionStatus(false);
        });

        socket.on('gameState', (state) => {
            this.log('Получено состояние игры', state);
            this.handleGameState(state);
        });

        return socket;
    }

    log(...messages) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] CLIENT:`, ...messages);
    }

    error(...messages) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] CLIENT ERROR:`, ...messages);
    }

    updateConnectionStatus(isConnected) {
        this.log('Обновление статуса подключения', isConnected);
        this.statusEl.classList.toggle('online', isConnected);
        this.statusEl.classList.toggle('offline', !isConnected);
        this.statusEl.textContent = isConnected ? 'Online' : 'Offline';
        this.startButton.disabled = !isConnected;
    }

    async loadHeroes() {
        try {
            this.log('Загрузка героев...');
            const response = await fetch('/assets/heroes/heroes.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            this.heroes = await response.json();
            this.log(`Загружено героев: ${this.heroes.length}`);
            this.renderHeroSelect();
        } catch (error) {
            this.error('Ошибка загрузки героев', error);
            this.showError('Не удалось загрузить список героев');
        }
    }

    renderHeroSelect() {
		this.heroSelectEl.innerHTML = this.heroes.map(hero => `
			<div class="hero-card" 
				 data-id="${hero.id}"
				 onclick="gameClient.toggleHeroSelection(${hero.id})"> <!-- Убрали кавычки -->
				<h3>${hero.name}</h3>
				<p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
			</div>
		`).join('');
	}

    toggleHeroSelection(heroId) {
        this.log('Выбор героя', heroId);
        
        const card = document.querySelector(`[data-id="${heroId}"]`);
        const wasSelected = this.selectedHeroes.has(heroId);

        if (wasSelected) {
            this.selectedHeroes.delete(heroId);
            card.classList.remove('selected');
        } else {
            if (this.selectedHeroes.size >= 5) {
                this.showError('Максимум 5 героев!');
                return;
            }
            this.selectedHeroes.add(heroId);
            card.classList.add('selected');
        }

        this.log(`Выбрано героев: ${this.selectedHeroes.size}`);
    }

    initEventListeners() {
        this.startButton.addEventListener('click', async () => {
            this.log('Нажатие кнопки "Играть PVE"');
            
            if (this.selectedHeroes.size !== 5) {
                this.showError('Пожалуйста, выберите 5 героев!');
                return;
            }

            try {
                this.log('Отправка запроса на сервер', [...this.selectedHeroes]);
                this.startButton.disabled = true;
                
                const response = await this.startPveGame([...this.selectedHeroes]);
                
                if (response.status === 'success') {
                    this.log('Игра успешно начата', response.sessionId);
                    this.startGameSession(response.sessionId);
                } else {
                    this.error('Ошибка сервера', response);
                    this.showError(response.message);
                }
            } catch (err) {
                this.error('Критическая ошибка', err);
                this.showError('Ошибка соединения с сервером');
            } finally {
                this.startButton.disabled = false;
            }
        });
    }

    async startPveGame(deck) {
        // Конвертируем строковые ID в числа
        const numericDeck = deck.map(id => {
            const numId = Number(id);
            if (isNaN(numId)) {
                this.error("Некорректный ID героя:", id);
                throw new Error("Обнаружены некорректные ID героев");
            }
            return numId;
        });

        this.log("Отправка числовых ID:", numericDeck);
        
        return new Promise((resolve, reject) => {
            this.socket.timeout(10000).emit('startPve', numericDeck, (err, response) => {
                if (err) {
                    // Обработка ошибок соединения
                    this.error("Ошибка сети:", err.message);
                    reject(new Error("Сервер не отвечает"));
                } else if (response.status === 'error') {
                    // Обработка бизнес-ошибок от сервера
                    this.error("Сервер вернул ошибку:", response.message);
                    reject(new Error(response.message || "Неизвестная ошибка сервера"));
                } else {
                    // Успешный ответ
                    resolve(response);
                }
            });
        });
    }

    startGameSession(sessionId) {
        this.log('Начало игровой сессии', sessionId);
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
    }

    showError(message) {
        this.log("Показ ошибки:", message);
        
        // Специальный элемент для ошибок вместо alert
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => errorEl.style.display = 'none', 5000);
        } else {
            console.error("Fallback error:", message);
        }
    }
}

// Глобальная ссылка для отладки
window.gameClient = new GameClient();