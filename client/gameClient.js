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

        // Обработчики событий
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('error', this.handleError.bind(this));

        // Инициализация
        this.loadHeroes();
        this.initEventListeners();
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
            this.heroes = await response.json();
            this.renderHeroSelect();
        } catch (err) {
            console.error('Hero loading failed:', err);
            alert('Не удалось загрузить героев');
        }
    }

    renderHeroSelect() {
        this.heroSelectEl.innerHTML = this.heroes.map(hero => `
            <div class="hero-card" 
                 data-id="${hero.id}"
                 onclick="gameClient.toggleHero(${hero.id})">
                <h3>${hero.name}</h3>
                <p>⚔️${hero.strength} ❤️${hero.health}</p>
            </div>
        `).join('');
    }

    toggleHero(heroId) {
        const card = document.querySelector(`[data-id="${heroId}"]`);
        
        if (this.selectedHeroes.has(heroId)) {
            this.selectedHeroes.delete(heroId);
            card.classList.remove('selected');
        } else {
            if (this.selectedHeroes.size >= 5) {
                alert('Максимум 5 героев!');
                return;
            }
            this.selectedHeroes.add(heroId);
            card.classList.add('selected');
        }
    }

    initEventListeners() {
        this.startButton.addEventListener('click', () => {
            if (this.selectedHeroes.size !== 5) {
                alert('Выберите 5 героев!');
                return;
            }

            const numericDeck = Array.from(this.selectedHeroes).map(Number);
            this.socket.emit('startPve', numericDeck, response => {
                if (response.status === 'success') {
                    document.getElementById('mainMenu').style.display = 'none';
                    document.getElementById('gameContainer').style.display = 'block';
                } else {
                    alert(`Ошибка: ${response.message}`);
                }
            });
        });
    }
}

// Инициализация после загрузки
window.gameClient = new GameClient();