import { GameState } from './modules/GameState.js';
import { SocketManager } from './modules/SocketManager.js';
import { UIManager } from './modules/UIManager.js';
import { GameLogic } from './modules/GameLogic.js';
const GL = GameLogic;
import { DOMHelper, ErrorHandler } from './modules/utils.js';

class GameClient {
  constructor() {
    this.state = new GameState();
    this.ui = new UIManager(this.getDOMElements());
    this.socket = new SocketManager('https://coobe.ru');
    this.gameLogic = new GameLogic();

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
      endTurnBtn: document.getElementById('endTurnBtn'),
      errorMessage: document.getElementById('error-message'),
      playerBattlefield: document.querySelector('.player-side .battlefield'),
      aiBattlefield: document.querySelector('.ai-side .battlefield'),
      turnTimer: document.getElementById('turnTimer')
    };
  }

  initialize() {
    DOMHelper.validateElements(this.ui.elements);
    this.setupSocketHandlers();
    this.setupEventListeners();
    this.loadGameAssets();
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      this.ui.elements.status.className = 'online';
      this.ui.elements.status.textContent = 'Online';
      this.ui.elements.startButton.disabled = false;
      console.log('Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.ui.elements.status.className = 'offline';
      this.ui.elements.status.textContent = 'Offline';
      this.ui.elements.startButton.disabled = true;
      console.log('Disconnected:', reason);
    });

    this.socket.on('gameState', (state) => this.handleGameState(state));
    this.socket.on('turnStart', (data) => this.handleTurnStart(data));
    this.socket.on('gameOver', (result) => this.handleGameOver(result));
  }

  setupEventListeners() {
    this.ui.elements.startButton.addEventListener('click', () => this.handleStartGame());
    this.ui.elements.confirmButton.addEventListener('click', () => this.handleDeckConfirmation());
    this.ui.elements.endTurnBtn.addEventListener('click', () => this.endTurn());
  }

  async loadGameAssets() {
    try {
      this.state.heroes = await GameLogic.loadHeroes();
      console.log('Heroes loaded:', this.state.heroes);
    } catch (error) {
      this.showError('Не удалось загрузить героев');
      console.error('Asset loading error:', error);
    }
  }

  handleGameState(state) {
    this.state.currentGameState = state;
    this.updateGameInterface();
    this.ui.toggleInterface('game');
  }

  updateGameInterface() {
    const state = this.state.currentGameState;
    if (!state) return;

    // Основные показатели
    this.ui.elements.gameId.textContent = `Игра #${state.id}`;
    this.ui.elements.playerHealth.textContent = state.human.health;
    this.ui.elements.aiHealth.textContent = state.ai.health;
    this.ui.elements.playerDeck.textContent = state.human.deck?.length || 0;
    this.ui.elements.aiDeck.textContent = state.ai.deck?.length || 0;

    // Рендер интерфейса
    this.renderPlayerHand(state.human.hand);
    this.renderBattlefield(state.human.field, state.ai.field);
  }

  renderPlayerHand(hand = []) {
    this.ui.elements.playerHand.innerHTML = hand
      .map(card => DOMHelper.createCardElement(card))
      .join('');
  }

  renderBattlefield(playerField = [], aiField = []) {
    this.ui.elements.playerBattlefield.innerHTML = playerField
      .map(unit => DOMHelper.createUnitElement(unit, 'player'))
      .join('');
    
    this.ui.elements.aiBattlefield.innerHTML = aiField
      .map(unit => DOMHelper.createUnitElement(unit, 'ai'))
      .join('');
  }

  handleStartGame() {
    if (!this.socket.connected) {
      this.showError('Нет подключения к серверу!');
      return;
    }
    this.ui.toggleInterface('heroSelect');
    this.renderHeroSelect();
  }

  renderHeroSelect() {
    if (!this.state.heroes?.length) {
      this.showError('Нет доступных героев');
      return;
    }
    
    this.ui.elements.heroSelect.innerHTML = this.state.heroes
      .map(hero => DOMHelper.createHeroCard(hero))
      .join('');
  }

  handleDeckConfirmation() {
    const selected = document.querySelectorAll('.hero-card.selected');
    if (selected.length !== 5) {
      this.showError('Выберите ровно 5 героев!');
      return;
    }

    const deck = Array.from(selected).map(card => 
      parseInt(card.dataset.id)
    );
    
    this.socket.emit('startPve', deck, (response) => {
      if (response.status === 'success') {
        this.handleGameState(response.gameState);
      } else {
        this.showError(response.message || 'Ошибка сервера');
      }
    });
  }

  endTurn() {
    if (!this.state.currentGameState) return;
    this.socket.emit('endTurn', this.state.currentGameState.id);
  }

  handleTurnStart({ timeLeft }) {
    this.startTurnTimer(timeLeft);
    this.toggleActions(true);
  }

  startTurnTimer(seconds) {
    this.state.clearTimer();
    let remaining = seconds;
    
    this.ui.elements.turnTimer.textContent = remaining;
    this.state.turnTimer = setInterval(() => {
      remaining--;
      this.ui.elements.turnTimer.textContent = remaining;
      if (remaining <= 0) this.forceEndTurn();
    }, 1000);
  }

  forceEndTurn() {
    this.state.clearTimer();
    this.toggleActions(false);
    this.endTurn();
  }

  toggleActions(enabled) {
    this.ui.elements.endTurnBtn.disabled = !enabled;
    document.querySelectorAll('.hand-card').forEach(card => {
      card.style.pointerEvents = enabled ? 'all' : 'none';
    });
  }

  handleGameOver(result) {
    alert(result === 'human' ? 'Победа!' : 'Поражение!');
    this.resetGame();
  }

  resetGame() {
    this.state.reset();
    this.ui.toggleInterface('main');
  }

  showError(message) {
    ErrorHandler.show(this.ui.elements.errorMessage, message);
  }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});