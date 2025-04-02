import { GameState } from './modules/GameState.js';
import { SocketManager } from './modules/SocketManager.js';
import { UIManager } from './modules/UIManager.js';
import { GameLogic } from './modules/GameLogic.js';
import { DOMHelper, ErrorHandler } from './modules/utils.js';

class GameClient {
  constructor() {
    // Инициализация основных компонентов
    this.state = new GameState();
    this.socket = new SocketManager('https://coobe.ru');
    this.ui = new UIManager(this.getDOMElements());
    this.initialize();
  }

  getDOMElements() {
    return {
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
  }

  initialize() {
    DOMHelper.validateElements(this.ui.elements);
    this.setupSocketHandlers();
    this.setupEventListeners();
    this.loadGameAssets();
  }

  setupSocketHandlers() {
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('error', this.handleSocketError.bind(this));
    this.socket.on('gameState', this.handleGameState.bind(this));
    this.socket.on('turnStart', this.handleTurnStart.bind(this));
    this.socket.on('actionResult', this.handleActionResult.bind(this));
    this.socket.on('aiAction', this.handleAiAction.bind(this));
    this.socket.on('gameOver', this.handleGameOver.bind(this));
  }

  setupEventListeners() {
    this.ui.elements.startButton.addEventListener('click', () => this.handleStartGame());
    this.ui.elements.confirmButton.addEventListener('click', () => this.handleDeckConfirmation());
  }

  async loadGameAssets() {
    try {
      this.state.heroes = await GameLogic.loadHeroes();
      console.log('Heroes loaded:', this.state.heroes);
    } catch (error) {
      ErrorHandler.show(this.ui.elements.errorMessage, 'Не удалось загрузить героев');
      console.error('Asset loading error:', error);
    }
  }

  /* --------------------------
     Обработчики сокет-событий
     -------------------------- */
  handleConnect() {
    this.ui.elements.status.className = 'online';
    this.ui.elements.status.textContent = 'Online';
    this.ui.elements.startButton.disabled = false;
    console.log('Connected:', this.socket.socket.id);
  }

  handleDisconnect(reason) {
    this.ui.elements.status.className = 'offline';
    this.ui.elements.status.textContent = 'Offline';
    this.ui.elements.startButton.disabled = true;
    console.log('Disconnected:', reason);
  }

  handleSocketError(err) {
    console.error('Socket error:', err);
    ErrorHandler.show(this.ui.elements.errorMessage, `Ошибка соединения: ${err.message}`);
  }

  handleGameState(state) {
    this.state.currentGameState = state;
    this.updateGameInterface();
    this.ui.toggleInterface('game');
  }

  handleTurnStart({ timeLeft }) {
    this.startTurnTimer(timeLeft);
    this.toggleActionButtons(true);
    this.updateTurnDisplay('Ваш ход');
  }

  handleActionResult(result) {
    this.processGameResult(result);
    this.updateGameInterface();
  }

  handleAiAction(action) {
    this.showAiAnimation();
    this.updateTurnDisplay('Противник атакует...');
  }

  handleGameOver(result) {
    this.showGameResult(result);
    this.resetGameInterface();
  }

  /* --------------------------
     Основная игровая логика
     -------------------------- */
  updateGameInterface() {
    const { human, ai } = this.state.currentGameState.players;
    
    // Обновление основных показателей
    this.ui.elements.gameId.textContent = `Игра #${this.state.currentGameState.id}`;
    this.ui.elements.playerHealth.textContent = human.health;
    this.ui.elements.aiHealth.textContent = ai.health;
    this.ui.elements.playerDeck.textContent = human.deck.length;
    this.ui.elements.aiDeck.textContent = ai.deck.length;

    // Обновление карт в руке
    this.renderPlayerHand(human.hand);
  }

  renderPlayerHand(hand) {
    this.ui.elements.playerHand.innerHTML = hand
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

  /* --------------------------
     Логика выбора героев
     -------------------------- */
  handleStartGame() {
    if (!this.socket.socket.connected) {
      ErrorHandler.show(this.ui.elements.errorMessage, 'Нет подключения к серверу!');
      return;
    }
    this.ui.toggleInterface('heroSelect');
    this.renderHeroSelect();
  }

  renderHeroSelect() {
    if (!this.state.heroes?.length) {
      ErrorHandler.show(this.ui.elements.errorMessage, 'Нет доступных героев');
      return;
    }
    this.ui.renderHeroCards(this.state.heroes, (e) => this.handleHeroClick(e));
  }

  handleHeroClick(event) {
    const card = event.currentTarget;
    const heroId = Number(card.dataset.id);
    
    if (this.state.selectedHeroes.has(heroId)) {
      this.state.selectedHeroes.delete(heroId);
      card.classList.remove('selected');
    } else {
      if (this.state.selectedHeroes.size >= 5) {
        ErrorHandler.show(this.ui.elements.errorMessage, 'Максимум 5 героев!');
        return;
      }
      this.state.selectedHeroes.add(heroId);
      card.classList.add('selected');
    }
    
    this.ui.updateHeroSelection(this.state.selectedHeroes.size);
  }

  handleDeckConfirmation() {
    if (!GameLogic.validateDeck(this.state.selectedHeroes)) {
      ErrorHandler.show(this.ui.elements.errorMessage, 'Выберите ровно 5 героев!');
      return;
    }
    
    const deck = Array.from(this.state.selectedHeroes);
    this.socket.emit('startPve', deck, (response) => {
      if (response.status === 'success') {
        this.ui.toggleInterface('game');
      } else {
        ErrorHandler.show(this.ui.elements.errorMessage, response.message || 'Ошибка сервера');
        this.ui.toggleInterface('main');
      }
    });
  }

  /* --------------------------
     Система ходов и времени
     -------------------------- */
  startTurnTimer(seconds) {
    this.state.clearTimer();
    let timeLeft = seconds;
    
    this.state.turnTimer = setInterval(() => {
      this.ui.elements.turnTimer.textContent = --timeLeft;
      if (timeLeft <= 0) this.forceEndTurn();
    }, 1000);
  }

  forceEndTurn() {
    this.state.clearTimer();
    this.toggleActionButtons(false);
    this.socket.emit('endTurn');
  }

  toggleActionButtons(enabled) {
    this.ui.elements.endTurnBtn.disabled = !enabled;
    document.querySelectorAll('.hand-card').forEach(card => {
      card.style.pointerEvents = enabled ? 'all' : 'none';
    });
  }

  /* --------------------------
     Вспомогательные методы
     -------------------------- */
  showAiAnimation() {
    const animation = document.createElement('div');
    animation.className = 'attack-animation';
    this.ui.elements.aiSide.appendChild(animation);
    setTimeout(() => animation.remove(), 1000);
  }

  showGameResult(result) {
    const resultText = result === 'human' ? 'Победа!' : 'Поражение!';
    alert(resultText);
    this.resetGameInterface();
  }

  resetGameInterface() {
    this.state.reset();
    this.ui.toggleInterface('main');
    this.ui.updateHeroSelection(0);
  }

  updateTurnDisplay(text) {
    this.ui.elements.currentTurn.textContent = text;
  }

  processGameResult(result) {
    // Логика обработки результатов действий
    if (result.damage) {
      this.showDamageEffect(result.target, result.amount);
    }
  }

  showDamageEffect(target, amount) {
    const element = target === 'human' 
      ? this.ui.elements.playerHealth 
      : this.ui.elements.aiHealth;
    
    element.classList.add('damage-effect');
    setTimeout(() => element.classList.remove('damage-effect'), 500);
  }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});