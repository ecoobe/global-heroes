import { GameState } from './modules/GameState.js';
import { SocketManager } from './modules/SocketManager.js';
import { UIManager } from './modules/UIManager.js';
import { GameLogic } from './modules/GameLogic.js';
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
      this.ui.showError(`Соединение потеряно: ${reason}`);
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
      this.ui.showError('Не удалось загрузить героев');
      console.error('Asset loading error:', error);
    }
  }

  handleGameState(state) {
	console.log('[GAME STATE] Received:', state);
	
	try {
	  // Принудительное обновление DOM
	  this.state.currentGameState = null;
	  this.state.currentGameState = state;
  
	  // Явное обновление интерфейса
	  this.ui.toggleInterface('game');
	  this.updateGameInterface();
  
	  // Дебаг-визуализация
	  this.ui.elements.gameContainer.style.border = '3px solid #00ff00';
	  setTimeout(() => {
		this.ui.elements.gameContainer.style.border = '';
	  }, 2000);
  
	} catch (error) {
	  console.error('UI update failed:', error);
	}
  }

  updateGameInterface() {
    const state = this.state.currentGameState;
    if (!state) return;

    // Обновление основных показателей
    this.ui.elements.gameId.textContent = `Игра #${state.id}`;
    this.ui.elements.playerHealth.textContent = state.human.health;
    this.ui.elements.aiHealth.textContent = state.ai.health;
    this.ui.elements.playerDeck.textContent = state.human.deck?.length || 0;
    this.ui.elements.aiDeck.textContent = state.ai.deck?.length || 0;

    // Обновление интерфейса
    this.renderPlayerHand(state.human.hand);
    this.renderBattlefield(state.human.field, state.ai.field);
  }

  renderPlayerHand(hand = []) {
    this.ui.elements.playerHand.innerHTML = hand
      .map(card => DOMHelper.createCardElement(card))
      .join('');
  }

  renderBattlefield(playerField = [], aiField = []) {
    this.ui.clearBattlefield();
    
    playerField.forEach(unit => {
      const element = DOMHelper.createUnitElement(unit, 'player');
      this.ui.elements.playerBattlefield.appendChild(element);
    });
    
    aiField.forEach(unit => {
      const element = DOMHelper.createUnitElement(unit, 'ai');
      this.ui.elements.aiBattlefield.appendChild(element);
    });
  }

  handleStartGame() {
    console.log('[DEBUG] StartGame:', {
      heroes: this.state.heroes?.length,
      socketStatus: this.socket.isConnected
    });
    
    if (!this.socket.isConnected) {
      this.ui.showError('Соединение не установлено!');
      return;
    }
    
    if (!this.state.heroes?.length) {
      this.ui.showError('Герои ещё не загружены');
      return;
    }
    
    this.ui.toggleInterface('heroSelect');
    this.renderHeroSelect();
  }

  renderHeroSelect() {
    try {
      this.ui.renderHeroCards(this.state.heroes, (e) => this.handleHeroClick(e));
    } catch (error) {
      this.ui.showError('Ошибка отображения героев');
      console.error('Hero render error:', error);
    }
  }

  handleHeroClick(event) {
    try {
      const card = event.currentTarget;
      const heroId = parseInt(card.dataset.id);
      
      card.classList.toggle('selected');
      const newSelection = new Set(this.state.selectedHeroes);
      
      if (newSelection.has(heroId)) {
        newSelection.delete(heroId);
      } else {
        if (newSelection.size >= 5) return;
        newSelection.add(heroId);
      }
      
      this.state.selectedHeroes = newSelection;
      this.ui.updateHeroSelection(newSelection.size);
    } catch (error) {
      this.ui.showError('Ошибка выбора героя');
      console.error('Hero selection error:', error);
    }
  }

  async handleDeckConfirmation() {
	let deck = null;
	
	try {
	  console.log('[DEBUG] Starting deck confirmation');
	  
	  // Проверка количества выбранных героев
	  if (this.state.selectedHeroes.size !== 5) {
		console.warn('[WARN] Invalid selection count:', this.state.selectedHeroes.size);
		throw new Error('Выберите ровно 5 героев!');
	  }
  
	  // Логирование сырых данных перед обработкой
	  console.log('[DEBUG] Raw selection:', 
		JSON.stringify(Array.from(this.state.selectedHeroes)));
	  console.log('[DEBUG] Available heroes IDs:', 
		JSON.stringify(this.state.heroes?.map(h => h.id) || []));
	  
	  // Преобразование и валидация ID
	  deck = Array.from(this.state.selectedHeroes).map(id => {
		const numId = Number(id);
		console.log(`[DEBUG] Processing ID: ${id} → ${numId}`);
		
		if (isNaN(numId)) {
		  console.error('[ERROR] Invalid ID conversion - Original ID:', id, 'Type:', typeof id);
		  throw new Error(`Некорректный ID: ${id} (тип: ${typeof id})`);
		}
		
		return numId;
	  });  
  
	  console.log('[INFO] Sanitized deck:', JSON.stringify(deck));
  
	  // Валидация колды
	  console.log('[DEBUG] Starting deck validation');
	  const validation = GameLogic.validateDeck(deck, this.state.heroes);
	  console.log('[DEBUG] Validation result:', validation);
  
	  if (!validation.isValid) {
		console.error('[ERROR] Deck validation failed:', validation.errors);
		throw new Error(validation.errors.join('\n'));
	  }
  
	  // Отправка на сервер
	  console.log('[INFO] Sending deck to server:', JSON.stringify(deck));
	  this.socket.emit('startPve', deck, (response) => {
		console.log('[DEBUG] Server response:', response);
		
		if (response.status === 'success') {
		  console.log('[INFO] Game started successfully. Session ID:', response.sessionId);
		  this.handleGameState(response.gameState);
		} else {
		  console.error('[ERROR] Server error response:', response);
		  this.ui.showError(response.message || 'Ошибка сервера');
		}
	  });
  
	} catch (error) {
	  console.error('[ERROR] Deck processing failed:', {
		error: error.stack, // Полный стек ошибки
		rawDeck: Array.from(this.state.selectedHeroes),
		validatedDeck: deck || 'N/A',
		heroesLoaded: !!this.state.heroes
	  });
	  
	  this.ui.showError(error.message);
	}
  }

  async endTurn() {
	try {
	  if (!this.state.currentGameState?.id) {
		this.ui.showError('Игра не активна');
		return;
	  }
  
	  await this.socket.emit('endTurn', this.state.currentGameState.id);
	  console.log('Ход успешно завершён');
	  
	} catch (error) {
	  this.ui.showError(error.message || 'Ошибка завершения хода');
	  console.error('Ошибка завершения хода:', error);
	}
  }

  handleTurnStart({ timeLeft }) {
    this.startTurnTimer(timeLeft);
    this.ui.toggleActionButtons(true);
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
    this.ui.toggleActionButtons(false);
    this.endTurn();
  }

  handleGameOver(result) {
    alert(result === 'human' ? 'Победа!' : 'Поражение!');
    this.resetGame();
  }

  resetGame() {
    this.state.reset();
    this.ui.toggleInterface('main');
    this.ui.clearBattlefield();
    this.ui.clearHand();
  }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});