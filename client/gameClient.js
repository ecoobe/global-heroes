class GameClient {
    constructor() {
        this.socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true
        });

        this.statusEl = document.getElementById('connection-status');
        this.startButton = document.getElementById('startPve');
        
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('error', this.handleError.bind(this));

        this.heroes = [];
        this.initEventListeners();
        this.loadHeroes();
    }

    handleConnect() {
        this.statusEl.classList.remove('offline');
        this.statusEl.classList.add('online');
        this.statusEl.textContent = 'Online';
        this.startButton.disabled = false;
        console.log('Connected to server');
    }

    handleDisconnect() {
        this.statusEl.classList.remove('online');
        this.statusEl.classList.add('offline');
        this.statusEl.textContent = 'Offline';
        this.startButton.disabled = true;
        console.log('Disconnected from server');
    }

    handleError(err) {
        console.error('Socket error:', err);
        this.statusEl.textContent = 'Connection Error';
        this.statusEl.style.background = '#ff9900';
    }

    async loadHeroes() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            this.heroes = await response.json();
            this.renderHeroSelect();
        } catch (error) {
            console.error('Failed to load heroes:', error);
        }
    }

    renderHeroSelect() {
        const container = document.getElementById('heroSelect');
        container.innerHTML = this.heroes.map(hero => `
            <div class="hero-card" data-id="${hero.id}">
                <h3>${hero.name}</h3>
                <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
            </div>
        `).join('');
    }

    initEventListeners() {
        this.startButton.addEventListener('click', () => {
            const selectedCards = Array.from(document.querySelectorAll('.hero-card.selected'))
                .map(card => card.dataset.id);
            
            if (selectedCards.length !== 5) {
                alert('Выберите 5 героев!');
                return;
            }

            this.socket.emit('startPve', selectedCards, (response) => {
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

window.addEventListener('DOMContentLoaded', () => {
    new GameClient();
});