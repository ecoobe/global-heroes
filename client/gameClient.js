class GameClient {
    constructor() {
        // 1. Инициализация сокета ДО использования
        this.socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true
        });

        // 2. Добавление обработчиков событий
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('error', this.handleError.bind(this));

        // 3. Инициализация остальных компонентов
        this.heroes = [];
        this.initEventListeners();
        this.loadHeroes();
        
        // 4. Добавим статус подключения в DOM
        this.createConnectionStatus();
    }

    createConnectionStatus() {
        const statusEl = document.createElement('div');
        statusEl.id = 'connection-status';
        statusEl.style.position = 'fixed';
        statusEl.style.top = '10px';
        statusEl.style.right = '10px';
        statusEl.style.padding = '5px 10px';
        statusEl.style.background = '#ff0000';
        statusEl.style.color = 'white';
        statusEl.textContent = 'Offline';
        document.body.appendChild(statusEl);
    }

    handleConnect() {
        this.isConnected = true;
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = "Online";
            statusEl.style.background = '#00ff00';
        }
        console.log('Connected to server');
    }

    handleDisconnect() {
        this.isConnected = false;
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = "Offline";
            statusEl.style.background = '#ff0000';
        }
        console.log('Disconnected from server');
    }

    handleError(err) {
        console.error('Socket error:', err);
        alert(`Connection error: ${err.message}`);
    }

    async loadHeroes() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.heroes = await response.json();
            this.renderHeroSelect();
        } catch (error) {
            console.error('Failed to load heroes:', error);
            this.heroes = [];
        }
    }

    renderHeroSelect() {
        const container = document.getElementById('heroSelect');
        if (!container) {
            console.error('Hero select container not found');
            return;
        }
        
        container.innerHTML = this.heroes.map(hero => `
            <div class="hero-card" data-id="${hero.id}">
                <h3>${hero.name}</h3>
                <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
            </div>
        `).join('');
    }

    initEventListeners() {
        const startButton = document.getElementById('startPve');
        if (!startButton) {
            console.error('Start PVE button not found');
            return;
        }
        
        startButton.addEventListener('click', () => {
            if (!this.isConnected) {
                alert('Not connected to server!');
                return;
            }
            
            // Временная заглушка для тестирования
            const testDeck = ['warrior', 'mage'];
            this.socket.emit('startPve', testDeck, (response) => {
                if (response.status === 'success') {
                    document.getElementById('mainMenu').style.display = 'none';
                    document.getElementById('gameContainer').style.display = 'block';
                } else {
                    alert(`Game start failed: ${response.message}`);
                }
            });
        });
    }
}

// Запуск после полной загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    new GameClient();
});