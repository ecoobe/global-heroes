class GameClient {
    constructor() {
        this.socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true,
            reconnectionAttempts: 3
        });

        this.elements = {
            status: document.getElementById('connection-status'),
            startButton: document.getElementById('startPve'),
            confirmButton: document.getElementById('confirmSelection'),
            heroSelect: document.getElementById('heroSelect'),
            mainMenu: document.getElementById('mainMenu'),
            gameContainer: document.getElementById('gameContainer'),
            heroSelectContainer: document.getElementById('heroSelectContainer'),
            playerHealth: document.getElementById('playerHealth'),
            playerDeck: document.getElementById('playerDeck'),
            aiHealth: document.getElementById('aiHealth'),
            aiDeck: document.getElementById('aiDeck'),
            currentTurn: document.getElementById('currentTurn'),
            gameId: document.querySelector('.game-id')
        };

        this.selectedHeroes = new Set();
        this.heroes = [];

        this.initSocketHandlers();
        this.initEventListeners();
        this.loadHeroes()
            .then(heroes => {
                this.heroes = heroes;
                console.log('Герои загружены:', heroes);
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
            this.elements.confirmButton.disabled = true;
            console.log('Disconnected:', reason);
        });

        this.socket.on('error', (err) => {
            console.error('Socket error:', err);
            this.showError(`Ошибка соединения: ${err.message}`);
        });

        this.socket.on('gameState', (state) => {
            this.updateGameInterface(state);
        });
    }

    updateGameInterface(state) {
        this.elements.gameId.textContent = `Игра #${state.id}`;
        this.elements.playerHealth.textContent = state.players.human.health;
        this.elements.playerDeck.textContent = state.players.human.deckSize;
        this.elements.aiHealth.textContent = state.players.ai.health;
        this.elements.aiDeck.textContent = state.players.ai.deckSize;
        this.elements.currentTurn.textContent = 
            state.turn === 'human' ? 'Ваш ход' : 'Ход противника';

        this.elements.heroSelectContainer.classList.remove('active');
        this.elements.gameContainer.classList.add('active');
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
        
        this.elements.confirmButton.disabled = this.selectedHeroes.size !== 5;
    }

    async loadHeroes() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            throw new Error('Ошибка загрузки данных');
        }
    }

    renderHeroSelect() {
        if (!this.heroes?.length) {
            this.showError('Нет доступных героев');
            return;
        }

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
            card.addEventListener('click', this.handleHeroClick.bind(this));
            fragment.appendChild(card);
        });

        this.elements.heroSelect.appendChild(fragment);
    }

    initEventListeners() {
        // Обработчик для кнопки "Играть PVE"
        this.elements.startButton.addEventListener('click', () => {
            if (!this.socket.connected) {
                this.showError('Нет подключения к серверу!');
                return;
            }
            
            this.elements.mainMenu.classList.remove('active');
            this.elements.heroSelectContainer.classList.add('active');
            this.renderHeroSelect();
        });

        // Обработчик для кнопки подтверждения выбора
        this.elements.confirmButton.addEventListener('click', () => {
            if (this.selectedHeroes.size !== 5) {
                this.showError('Выберите ровно 5 героев!');
                return;
            }

            const deck = Array.from(this.selectedHeroes);
            this.socket.emit('startPve', deck, (response) => {
                if (response.status !== 'success') {
                    this.showError(response.message || 'Ошибка сервера');
                    this.elements.heroSelectContainer.classList.remove('active');
                    this.elements.mainMenu.classList.add('active');
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