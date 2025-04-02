class GameClient {
    constructor() {
        // Инициализация сокета
        this.socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true,
            reconnectionAttempts: 3
        });

        // DOM элементы
        this.elements = {
            status: document.getElementById('connection-status'),
            startButton: document.getElementById('startPve'),
            heroSelect: document.getElementById('heroSelect'),
            mainMenu: document.getElementById('mainMenu'),
            gameContainer: document.getElementById('gameContainer'),
            heroSelectContainer: document.getElementById('heroSelectContainer'),
            gameState: document.getElementById('gameState'),
            playerHealth: document.getElementById('playerHealth'),
            playerDeck: document.getElementById('playerDeck'),
            aiHealth: document.getElementById('aiHealth'),
            aiDeck: document.getElementById('aiDeck'), // Добавлен отсутствующий элемент
            currentTurn: document.getElementById('currentTurn'), // Добавлен отсутствующий элемент
            gameId: document.querySelector('.game-id')
        };

        this.selectedHeroes = new Set();
        this.heroes = [];

        // Привязка контекста
        this.handleHeroClick = this.handleHeroClick.bind(this);

        // Инициализация состояний
        this.elements.mainMenu.classList.add('active');
        this.elements.heroSelectContainer.classList.remove('active');
        this.elements.gameContainer.classList.remove('active');

        // Инициализация
        this.initSocketHandlers();
        this.initEventListeners();
        this.loadHeroes()
            .then(heroes => {
                this.heroes = heroes;
                console.log('Герои загружены:', heroes);
                this.renderHeroSelect();
            })
            .catch(err => {
                console.error('Ошибка загрузки:', err);
                this.showError('Не удалось загрузить героев');
            });
    }

    initSocketHandlers() {
        this.socket.on('connect', () => {
            this.elements.status.className = 'online';
            this.elements.status.textContent = 'Online';
            this.elements.startButton.disabled = false;
            console.log('Connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            this.elements.status.className = 'offline';
            this.elements.status.textContent = 'Offline';
            this.elements.startButton.disabled = true;
            console.log('Disconnected:', reason);
        });

        this.socket.on('error', (err) => {
            console.error('Socket error:', err);
            alert(`Ошибка соединения: ${err.message}`);
        });

        this.socket.on('gameState', (state) => {
            console.log('Received game state:', state);
            this.updateGameInterface(state);
        });
    }

    updateGameInterface(state) {
		// Принудительное обновление DOM
		requestAnimationFrame(() => {
			// Обновляем данные
			this.elements.gameId.textContent = `Игра #${state.id}`;
			this.elements.playerHealth.textContent = state.players.human.health;
			this.elements.playerDeck.textContent = state.players.human.deckSize;
			this.elements.aiHealth.textContent = state.players.ai.health;
			this.elements.aiDeck.textContent = state.players.ai.deckSize;
			this.elements.currentTurn.textContent = 
				state.turn === 'human' ? 'Ваш ход' : 'Ход противника';
	
			// Переключаем видимость
			this.elements.heroSelectContainer.classList.remove('active');
			this.elements.gameContainer.classList.add('active');
			
			// Форсируем рефлоу
			void this.elements.gameContainer.offsetHeight;
		});
	}

    handleHeroClick(event) {
        const card = event.currentTarget;
        const heroId = Number(card.dataset.id);
        
        if (this.selectedHeroes.has(heroId)) {
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
        console.log('Выбрано героев:', this.selectedHeroes.size);
    }

    async loadHeroes() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const heroes = await response.json();
            
            // Валидация и преобразование данных
            return heroes.map(hero => ({
                ...hero,
                id: Number(hero.id),
                strength: Number(hero.strength),
                health: Number(hero.health),
                image: `/assets/heroes/images/${hero.image}` // Исправленный путь
            }));
        } catch (err) {
            throw new Error('Ошибка загрузки данных');
        }
    }

    renderHeroSelect() {
        if (!this.heroes || this.heroes.length === 0) {
            this.elements.heroSelect.innerHTML = '<div class="error">Нет доступных героев</div>';
            return;
        }

        // Переключаем контейнеры
        this.elements.mainMenu.classList.remove('active');
        this.elements.heroSelectContainer.classList.add('active');

        // Очищаем и рендерим карточки
        this.elements.heroSelect.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        this.heroes.forEach(hero => {
            const card = document.createElement('div');
            card.className = 'hero-card';
            card.dataset.id = hero.id;
            card.innerHTML = `
                <div class="hero-image" 
                     style="background-image: url('${hero.image}')">
                </div>
                <h3>${hero.name}</h3>
                <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
            `;
            card.addEventListener('click', this.handleHeroClick);
            fragment.appendChild(card);
        });

        this.elements.heroSelect.appendChild(fragment);
    }

    initEventListeners() {
        this.elements.startButton.addEventListener('click', () => {
            if (this.selectedHeroes.size !== 5) {
                this.showError('Выберите 5 героев!');
                return;
            }

            const numericDeck = Array.from(this.selectedHeroes);
            this.socket.emit('startPve', numericDeck, response => {
				console.log('Server response:', response);
                if (response.status !== 'success') {
                    this.showError(response.message || 'Ошибка сервера');
				} else {
					console.log('Game started successfully');
				}
            });
        });
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => errorEl.style.display = 'none', 5000);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new GameClient();
});