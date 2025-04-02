class GameClient {
    constructor() {
        // Инициализация WebSocket соединения
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

        // Состояние клиента
        this.selectedHeroes = new Set();
        this.heroes = [];
        this.turnTimer = null;
        this.currentGameState = null;

        // Инициализация
        this.initSocketHandlers();
        this.initEventListeners();
        this.loadGameAssets();
    }

    /* --------------------------
       Инициализация компонентов
       -------------------------- */
    initSocketHandlers() {
        // Обработчики событий WebSocket
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
        // UI обработчики
        this.elements.startButton.addEventListener('click', this.handleStartGame.bind(this));
        this.elements.confirmButton.addEventListener('click', this.handleDeckConfirmation.bind(this));
    }

    /* --------------------------
       Обработчики сетевых событий
       -------------------------- */
    handleConnect() {
        this.updateConnectionStatus('online', 'Online');
        this.elements.startButton.disabled = false;
        console.log('WebSocket connected:', this.socket.id);
    }

    handleDisconnect(reason) {
        this.updateConnectionStatus('offline', 'Offline');
        this.elements.startButton.disabled = true;
        console.log('WebSocket disconnected:', reason);
    }

    handleSocketError(err) {
        console.error('WebSocket error:', err);
        this.showError(`Connection error: ${err.message}`);
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

    /* --------------------------
       Игровая логика
       -------------------------- */
    async loadGameAssets() {
        try {
            this.heroes = await this.fetchHeroes();
            console.log('Heroes loaded:', this.heroes);
        } catch (error) {
            this.showError('Failed to load game assets');
            console.error('Asset loading error:', error);
        }
    }

    startTurnTimer(seconds) {
        this.clearExistingTimer();
        let timeLeft = seconds;
        
        this.turnTimer = setInterval(() => {
            this.elements.turnTimer.textContent = --timeLeft;
            if(timeLeft <= 0) this.forceEndTurn();
        }, 1000);
    }

    processCardPlay(cardId) {
        if(!this.validateCardPlay(cardId)) return;
        
        this.socket.emit('playerAction', {
            type: 'playCard',
            cardId: cardId,
            target: 'ai'
        });
    }

    validateCardPlay(cardId) {
        return this.currentGameState?.turn === 'human' && 
               this.currentGameState.players.human.hand.some(c => c.id === cardId);
    }

    /* --------------------------
       UI методы
       -------------------------- */
    updateGameInterface(state) {
        // Основные показатели
        this.elements.gameId.textContent = `Game #${state.id}`;
        this.elements.playerHealth.textContent = state.players.human.health;
        this.elements.aiHealth.textContent = state.players.ai.health;
        
        // Колоды
        this.elements.playerDeck.textContent = state.players.human.deck.length;
        this.elements.aiDeck.textContent = state.players.ai.deck.length;

        // Карты в руке
        this.renderPlayerHand(state.players.human.hand);
    }

    renderPlayerHand(hand) {
        this.elements.playerHand.innerHTML = hand
            .map(card => this.createCardElement(card))
            .join('');
    }

    createCardElement(card) {
        return `
            <div class="hand-card" data-id="${card.id}" onclick="gameClient.processCardPlay(${card.id})">
                <div class="card-header">
                    <span class="card-cost">${card.cost}⚡</span>
                    <span class="card-name">${card.name}</span>
                </div>
                <div class="card-description">${card.effect}</div>
            </div>
        `;
    }

    toggleInterface(screen) {
        const interfaces = {
            main: this.elements.mainMenu,
            heroSelect: this.elements.heroSelectContainer,
            game: this.elements.gameContainer
        };

        Object.values(interfaces).forEach(el => el.classList.remove('active'));
        interfaces[screen]?.classList.add('active');
    }

    /* --------------------------
       Вспомогательные методы
       -------------------------- */
    async fetchHeroes() {
        const response = await fetch('/assets/heroes/heroes.json');
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    clearExistingTimer() {
        if(this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
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

    /* --------------------------
       Публичные методы для UI
       -------------------------- */
    handleStartGame() {
        if(!this.socket.connected) {
            this.showError('Нет подключения к серверу!');
            return;
        }
        this.toggleInterface('heroSelect');
        this.renderHeroSelection();
    }

    handleDeckConfirmation() {
        if(this.selectedHeroes.size !== 5) {
            this.showError('Выберите ровно 5 героев!');
            return;
        }
        
        const deck = Array.from(this.selectedHeroes);
        this.socket.emit('startPve', deck, this.handleStartGameResponse.bind(this));
    }

    handleStartGameResponse(response) {
        if(response.status !== 'success') {
            this.showError(response.message || 'Ошибка сервера');
            this.toggleInterface('main');
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
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new GameClient();
});