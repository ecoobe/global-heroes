class GameClient {
    constructor() {
        this.socket = io({
            transports: ['websocket'],
            secure: true,
            path: '/socket.io'
        });

        this.initEventListeners();
        this.loadHeroes();
    }

    async loadHeroes() {
        const response = await fetch('/assets/heroes/heroes.json');
        this.heroes = await response.json();
        this.renderHeroSelect();
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
        document.getElementById('startPve').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
        });
    }
}

new GameClient();