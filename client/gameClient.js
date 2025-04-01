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
        this.statusEl = document.getElementById('connection-status');
        this.startButton = document.getElementById('startPve');
        this.heroSelectEl = document.getElementById('heroSelect');
        this.selectedHeroes = new Set();
        this.heroes = [];

        // Привязка контекста
        this.handleHeroClick = this.handleHeroClick.bind(this);

        // Обработчики событий
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('error', this.handleError.bind(this));

        // Инициализация
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

    handleConnect() {
        this.statusEl.className = 'online';
        this.statusEl.textContent = 'Online';
        this.startButton.disabled = false;
        console.log('Connected:', this.socket.id);
    }

    handleDisconnect(reason) {
        this.statusEl.className = 'offline';
        this.statusEl.textContent = 'Offline';
        this.startButton.disabled = true;
        console.log('Disconnected:', reason);
    }

    handleError(err) {
        console.error('Socket error:', err);
        alert(`Ошибка соединения: ${err.message}`);
    }

    async loadHeroes() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const heroes = await response.json();
            
            // Валидация данных
            if (!Array.isArray(heroes)) throw new Error("Неверный формат данных");
            return heroes.map(hero => ({
                ...hero,
                id: Number(hero.id),
                strength: Number(hero.strength),
                health: Number(hero.health)
            }));
        } catch (err) {
            throw new Error('Ошибка загрузки данных');
        }
    }

    renderHeroSelect() {
        if (!this.heroes || this.heroes.length === 0) {
            this.heroSelectEl.innerHTML = '<div class="error">Нет доступных героев</div>';
            return;
        }

        this.heroSelectEl.innerHTML = this.heroes
            .map(hero => `
                <div class="hero-card" data-id="${hero.id}">
                    <div class="hero-image" style="background-image: url('${hero.image}')"></div>
                    <h3>${hero.name}</h3>
                    <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
                </div>
            `).join('');

        // Добавляем обработчики после рендера
        this.heroSelectEl.querySelectorAll('.hero-card').forEach(card => {
            card.addEventListener('click', this.handleHeroClick);
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

    initEventListeners() {
        this.startButton.addEventListener('click', () => {
            if (this.selectedHeroes.size !== 5) {
                this.showError('Выберите 5 героев!');
                return;
            }

            const numericDeck = Array.from(this.selectedHeroes);
            this.socket.emit('startPve', numericDeck, response => {
                if (response.status === 'success') {
                    document.getElementById('mainMenu').style.display = 'none';
                    document.getElementById('gameContainer').style.display = 'block';
                } else {
                    this.showError(response.message || 'Ошибка сервера');
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

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new GameClient();
});