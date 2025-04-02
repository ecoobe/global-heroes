class GameClient {
    constructor() {
        this.socket = io('https://coobe.ru', {
            path: '/socket.io/',
            transports: ['websocket'],
            withCredentials: true,
            reconnectionAttempts: 3
        });

        // Кэширование DOM элементов
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
            gameId: document.querySelector('.game-id'),
            playerHand: document.getElementById('playerHand'),
            endTurnBtn: document.querySelector('.end-turn-btn'),
            errorMessage: document.getElementById('error-message')
        };

        this.selectedHeroes = new Set();
        this.heroes = [];
        this.turnTimer = null;
        this.currentGameState = null;

        this.validateDOMElements();
        this.initSocketHandlers();
        this.initEventListeners();
        this.loadGameAssets();
    }

    validateDOMElements() {
        Object.entries(this.elements).forEach(([name, element]) => {
            if (!element) throw new Error(`DOM element not found: ${name}`);
        });
    }

    initSocketHandlers() {
        this.socket
            .on('connect', this.handleConnect.bind(this))
            .on('disconnect', this.handleDisconnect.bind(this))
            .on('error', this.handleSocketError.bind(this))
            .on('gameState', this.handleGameState.bind(this))
            .on('turnStart', this.handleTurnStart.bind(this))
            .on('actionResult', this.handleActionResult.bind(this))
            .on('aiAction', this.handleAiAction.bind(this))
            .on('gameOver', this.handleGameOver.bind(this));
    }

    initEventListeners() {
        this.elements.startButton.addEventListener('click', this.handleStartGame.bind(this));
        this.elements.confirmButton.addEventListener('click', this.handleDeckConfirmation.bind(this));
    }

    async loadGameAssets() {
        try {
            const response = await fetch('/assets/heroes/heroes.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.heroes = await response.json();
            if (!Array.isArray(this.heroes)) throw new Error('Invalid heroes data');
            console.log('Heroes loaded:', this.heroes);
        } catch (error) {
            this.showError('Не удалось загрузить героев');
            console.error('Asset loading error:', error);
        }
    }

    handleConnect() {
        this.updateConnectionStatus('online', 'Online');
        this.elements.startButton.disabled = false;
        console.log('Connected:', this.socket.id);
    }

    handleDisconnect(reason) {
        this.updateConnectionStatus('offline', 'Offline');
        this.elements.startButton.disabled = true;
        console.log('Disconnected:', reason);
    }

    handleSocketError(err) {
        console.error('Socket error:', err);
        this.showError(`Ошибка соединения: ${err.message}`);
    }

    handleGameState(state) {
        this.currentGameState = state;
        this.updateGameInterface(state);
        this.toggleInterface('game');
    }

    handleTurnStart({ timeLeft }) {
        this.startTurnTimer(timeLeft);
        this.toggleActionButtons(true);
        this.updateTurnDisplay('Ваш ход');
    }

    handleActionResult(result) {
        this.processGameResult(result);
        this.updateGameInterface(this.currentGameState);
    }

    handleAiAction(action) {
        this.showAiAnimation(action);
        this.updateTurnDisplay('Противник атакует...');
    }

    handleGameOver(result) {
        this.showGameResult(result);
        this.resetGameInterface();
    }

    updateGameInterface(state) {
        this.elements.gameId.textContent = `Игра #${state.id}`;
        this.elements.playerHealth.textContent = state.players.human.health;
        this.elements.aiHealth.textContent = state.players.ai.health;
        this.elements.playerDeck.textContent = state.players.human.deck.length;
        this.elements.aiDeck.textContent = state.players.ai.deck.length;
        this.renderPlayerHand(state.players.human.hand);
    }

    renderPlayerHand(hand) {
        this.elements.playerHand.innerHTML = hand
            .map(card => this.createCardElement(card))
            .join('');
    }

    createCardElement(card) {
        return `
            <div class="hand-card" data-id="${card.id}">
                <div class="card-header">
                    <span class="card-cost">${card.cost}⚡</span>
                    <span class="card-name">${card.name}</span>
                </div>
                <div class="card-description">${card.effect}</div>
            </div>
        `;
    }

    toggleInterface(screen) {
        ['main', 'heroSelect', 'game'].forEach(ui => 
            this.elements[`${ui}${ui === 'main' ? 'Menu' : 'Container'}`]?.classList.remove('active')
        );
        if (screen === 'main') this.elements.mainMenu.classList.add('active');
        else this.elements[`${screen}Container`]?.classList.add('active');
    }

    handleStartGame() {
        if (!this.socket.connected) {
            this.showError('Нет подключения к серверу!');
            return;
        }
        this.toggleInterface('heroSelect');
        this.renderHeroSelect();
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
                <div class="hero-image" style="background-image: url('${hero.image}')"></div>
                <h3>${hero.name}</h3>
                <p>⚔️ ${hero.strength} ❤️ ${hero.health}</p>
            `;
            card.addEventListener('click', this.handleHeroClick.bind(this));
            fragment.appendChild(card);
        });

        this.elements.heroSelect.appendChild(fragment);
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
        
        this.updateConfirmButton();
    }

    updateConfirmButton() {
        const count = this.selectedHeroes.size;
        this.elements.confirmButton.disabled = count !== 5;
        this.elements.confirmButton.innerHTML = `
            <span class="btn-text">Подтвердить выбор (${count}/5)</span>
        `;
    }

    handleDeckConfirmation() {
        if (this.selectedHeroes.size !== 5) {
            this.showError('Выберите ровно 5 героев!');
            return;
        }
        
        const deck = Array.from(this.selectedHeroes);
        this.socket.emit('startPve', deck, (response) => {
            if (response.status === 'success') {
                this.toggleInterface('game');
            } else {
                this.showError(response.message || 'Ошибка сервера');
                this.toggleInterface('main');
            }
        });
    }

    startTurnTimer(seconds) {
        this.clearExistingTimer();
        let timeLeft = seconds;
        
        this.turnTimer = setInterval(() => {
            this.elements.turnTimer.textContent = --timeLeft;
            if (timeLeft <= 0) this.forceEndTurn();
        }, 1000);
    }

    clearExistingTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }

    forceEndTurn() {
        this.clearExistingTimer();
        this.toggleActionButtons(false);
        this.socket.emit('endTurn');
    }

    toggleActionButtons(enabled) {
        this.elements.endTurnBtn.disabled = !enabled;
        document.querySelectorAll('.hand-card').forEach(card => {
            card.style.pointerEvents = enabled ? 'all' : 'none';
        });
    }

    showAiAnimation() {
        const aiSide = document.querySelector('.ai-side');
        const animation = document.createElement('div');
        animation.className = 'attack-animation';
        aiSide.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
    }

    showGameResult(result) {
        const resultText = result === 'human' ? 'Победа!' : 'Поражение!';
        alert(resultText);
        this.resetGameInterface();
    }

    resetGameInterface() {
        this.toggleInterface('main');
        this.selectedHeroes.clear();
        this.elements.heroSelect.innerHTML = '';
        this.updateConfirmButton();
    }

    updateConnectionStatus(status, text) {
        this.elements.status.className = status;
        this.elements.status.textContent = text;
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        setTimeout(() => {
            this.elements.errorMessage.style.display = 'none';
        }, 5000);
    }

    updateTurnDisplay(text) {
        this.elements.currentTurn.textContent = text;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new GameClient();
});