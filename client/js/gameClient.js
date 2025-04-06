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

    // Расширенная система логирования
    this.debug = {
      lastState: null,
      transitions: [],
      log: (event, data, level = 'info') => {
        const entry = {
          timestamp: new Date().toISOString(),
          event,
          data,
          level,
          stack: new Error().stack.split('\n').slice(2).join('\n')
        };
        console[level](`[${entry.timestamp}] ${event}:`, data);
        this.debug.transitions.push(entry);
      },
      dump: () => JSON.stringify(this.debug.transitions, null, 2)
    };

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
    try {
      DOMHelper.validateElements(this.ui.elements);
      this.setupSocketHandlers();
      this.setupEventListeners();
      this.loadGameAssets();
      
      this.debug.log('CLIENT_INIT_COMPLETE', {
        validatedElements: Object.keys(this.ui.elements),
        socketStatus: this.socket.isConnected,
        gameState: this.state.currentGameState
      }, 'debug');
    } catch (error) {
      this.debug.log('INIT_ERROR', error, 'error');
      this.ui.showError('Критическая ошибка инициализации');
    }
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      this.debug.log('SOCKET_CONNECTED', {
        id: this.socket.id,
        transport: this.socket.socket?.io?.engine?.transport?.name
      }, 'info');
      
      this.ui.elements.status.className = 'online';
      this.ui.elements.status.textContent = 'Online';
      this.ui.elements.startButton.disabled = false;
    });

    this.socket.on('disconnect', (reason) => {
      this.debug.log('SOCKET_DISCONNECTED', {
        reason,
        reconnecting: this.socket.socket?.reconnecting
      }, 'warn');
      
      this.ui.elements.status.className = 'offline';
      this.ui.elements.status.textContent = 'Offline';
      this.ui.elements.startButton.disabled = true;
      this.ui.showError(`Соединение потеряно: ${reason}`);
    });

    this.socket.on('game_start', (data) => {
      this.debug.log('GAME_START_EVENT', {
        gameId: data?.id,
        humanHealth: data?.human?.health,
        aiHealth: data?.ai?.health
      }, 'info');
      
      this.handleGameState(data);
    });

    this.socket.on('gameState', (state) => {
      this.debug.log('GAME_STATE_UPDATE', {
        prevState: this.state.currentGameState?.id,
        newState: state?.id,
        diff: this.getStateDiff(this.state.currentGameState, state)
      }, 'debug');
      
      this.handleGameState(state);
    });

    this.socket.on('turnStart', (data) => {
      this.debug.log('TURN_STARTED', {
        timeLeft: data.timeLeft,
        currentPlayer: data.playerType
      }, 'info');
      
      this.handleTurnStart(data);
    });

    this.socket.on('gameOver', (result) => {
      this.debug.log('GAME_OVER', {
        result,
        finalState: this.state.currentGameState
      }, 'info');
      
      this.handleGameOver(result);
    });

    this.socket.on('connect_error', (err) => {
      this.debug.log('SOCKET_CONNECT_ERROR', {
        error: err.message,
        stack: err.stack
      }, 'error');
    });
  }

  setupEventListeners() {
    this.ui.elements.startButton.addEventListener('click', () => {
      this.debug.log('MAIN_MENU_START_CLICK', {
        heroesLoaded: !!this.state.heroes,
        socketStatus: this.socket.isConnected
      }, 'info');
      
      this.handleStartGame();
    });

    this.ui.elements.confirmButton.addEventListener('click', () => {
      this.debug.log('HERO_SELECT_CONFIRM_CLICK', {
        selectedCount: this.state.selectedHeroes.size,
        selectedIds: Array.from(this.state.selectedHeroes)
      }, 'info');
      
      this.handleDeckConfirmation();
    });

    this.ui.elements.endTurnBtn.addEventListener('click', () => {
      this.debug.log('END_TURN_CLICK', {
        gameId: this.state.currentGameState?.id,
        currentTurn: this.state.currentGameState?.currentTurn
      }, 'info');
      
      this.endTurn();
    });

    window.addEventListener('beforeunload', () => {
      this.debug.log('WINDOW_UNLOAD', {
        activeGame: !!this.state.currentGameState,
        socketConnected: this.socket.isConnected
      }, 'info');
      
      this.socket.disconnect();
    });
  }

  async loadGameAssets() {
    try {
      const loadStart = performance.now();
      this.state.heroes = await GameLogic.loadHeroes();
      
      this.debug.log('ASSETS_LOADED', {
        count: this.state.heroes.length,
        duration: performance.now() - loadStart,
        heroes: this.state.heroes.map(h => h.id)
      }, 'info');
    } catch (error) {
      this.debug.log('ASSET_LOAD_FAILED', {
        error: error.message,
        stack: error.stack
      }, 'error');
      
      this.ui.showError('Не удалось загрузить героев');
      throw error;
    }
  }

  handleGameState(state) {
    try {
      this.debug.log('PROCESSING_GAME_STATE', {
        previousState: this.state.currentGameState?.id,
        newState: state?.id
      }, 'debug');
      
      // Обновляем состояние игры
      this.state.currentGameState = state;

      // Инициализация игроков
      this.players = {
        human: this.createHumanPlayer(state.human.deck) || this._createDefaultPlayer(),
        ai: this.createAIPlayer() || this._createDefaultPlayer()
      };
      console.log('[DEBUG][🤖] AI Deck Size after creation:', this.players.ai.deck.length);

      // Далее обрабатываем интерфейс игры
      if (!this.ui.elements.gameContainer.classList.contains('active')) {
        this.debug.log('UI_TRANSITION', {
          from: 'heroSelect',
          to: 'game',
          trigger: 'game_start'
        }, 'info');
        
        this.ui.toggleInterface('game');
      }

      this.updateGameInterface();
      this.debug.log('UI_UPDATE_COMPLETED', {
        gameContainerActive: this.ui.elements.gameContainer.classList.contains('active'),
        renderedCards: this.ui.elements.playerHand.children.length
      }, 'debug');
    } catch (error) {
      this.debug.log('GAME_STATE_ERROR', {
        error: error.message,
        state: state,
        stack: error.stack
      }, 'error');
      
      this.ui.showError('Ошибка отображения игры');
    }
  }

  updateGameInterface() {
	try {
	  const state = this.state.currentGameState;
	  
	  // Глубокая проверка состояния
	  const isValidState = state?.id && 
						 state.human && 
						 state.ai &&
						 Number.isInteger(state.human.health) &&
						 Number.isInteger(state.ai.health);
  
	  if (!isValidState) {
		this.debug.log('INVALID_GAME_STATE', {
		  receivedState: state,
		  humanValid: !!state?.human,
		  aiValid: !!state?.ai
		}, 'error');
		
		this.ui.showError('Некорректные данные игры');
		return;
	  }
  
	  this.debug.log('UPDATING_INTERFACE', {
		gameId: state.id,
		humanHealth: state.human.health ?? 'N/A',
		aiHealth: state.ai.health ?? 'N/A',
		humanDeckSize: state.human.deck?.length ?? 0,
		aiDeckSize: state.ai.deck?.length ?? 0
	  }, 'debug');
  
	  // Безопасное обновление UI элементов
	  this.ui.elements.gameId.textContent = `Игра #${state.id}`;
	  
	  // Здоровье игроков
	  this.ui.elements.playerHealth.textContent = 
		state.human.health?.toLocaleString() ?? '0';
		
	  this.ui.elements.aiHealth.textContent = 
		state.ai.health?.toLocaleString() ?? '0';
  
	  // Размеры колод
	  this.ui.elements.playerDeck.textContent = 
		state.human.deck?.length?.toString()?.padStart(2, '0') ?? '00';
		
	  this.ui.elements.aiDeck.textContent = 
		state.ai.deck?.length?.toString()?.padStart(2, '0') ?? '00';
  
	  // Отрисовка с fallback значениями
	  this.renderPlayerHand(state.human.hand ?? []);
	  this.renderBattlefield(
		state.human.field ?? [],
		state.ai.field ?? []
	  );
  
	  // Валидация результата
	  const interfaceValid = [
		this.ui.elements.playerHealth.textContent,
		this.ui.elements.aiHealth.textContent,
		this.ui.elements.playerDeck.textContent,
		this.ui.elements.aiDeck.textContent
	  ].every(Boolean);
  
	  this.debug.log('INTERFACE_UPDATE_RESULT', {
		success: interfaceValid,
		elementsUpdated: {
		  playerHealth: this.ui.elements.playerHealth.textContent,
		  aiHealth: this.ui.elements.aiHealth.textContent,
		  playerDeck: this.ui.elements.playerDeck.textContent,
		  aiDeck: this.ui.elements.aiDeck.textContent
		}
	  }, 'debug');
  
	} catch (error) {
	  this.debug.log('CRITICAL_UI_FAILURE', {
		error: error.message,
		stack: error.stack,
		lastState: this.state.currentGameState
	  }, 'error');
	  
	  this.ui.showError('Критический сбой интерфейса');
	  this.ui.toggleInterface('main');
	}
  }

  renderPlayerHand(hand = []) {
    try {
      this.debug.log('RENDERING_PLAYER_HAND', {
        cardCount: hand.length,
        cardIds: hand.map(c => c.id)
      }, 'debug');
      
      this.ui.elements.playerHand.innerHTML = hand
        .map(card => DOMHelper.createCardElement(card))
        .join('');
    } catch (error) {
      this.debug.log('HAND_RENDER_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  renderBattlefield(playerField = [], aiField = []) {
    try {
      this.debug.log('RENDERING_BATTLEFIELD', {
        playerUnits: playerField.length,
        aiUnits: aiField.length
      }, 'debug');
      
      this.ui.clearBattlefield();
      
      playerField.forEach(unit => {
        const element = DOMHelper.createUnitElement(unit, 'player');
        this.ui.elements.playerBattlefield.appendChild(element);
      });
      
      aiField.forEach(unit => {
        const element = DOMHelper.createUnitElement(unit, 'ai');
        this.ui.elements.aiBattlefield.appendChild(element);
      });
    } catch (error) {
      this.debug.log('BATTLEFIELD_RENDER_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  handleStartGame() {
    try {
      this.debug.log('STARTING_NEW_GAME', {
        heroesAvailable: this.state.heroes?.length,
        socketConnected: this.socket.isConnected
      }, 'info');
      
      if (!this.socket.isConnected) {
        this.debug.log('CONNECTION_ERROR', {
          status: this.socket.socket?.connected,
          transport: this.socket.socket?.io?.engine?.transport?.name
        }, 'error');
        
        this.ui.showError('Соединение не установлено!');
        return;
      }
      
      this.ui.toggleInterface('heroSelect');
      this.renderHeroSelect();
    } catch (error) {
      this.debug.log('GAME_START_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  renderHeroSelect() {
    try {
      this.debug.log('RENDERING_HERO_SELECT', {
        heroCount: this.state.heroes.length
      }, 'debug');
      
      this.ui.renderHeroCards(this.state.heroes, (e) => this.handleHeroClick(e));
    } catch (error) {
      this.debug.log('HERO_SELECT_RENDER_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  handleHeroClick(event) {
    try {
      const card = event.currentTarget;
      const heroId = parseInt(card.dataset.id, 10);
      
      this.debug.log('HERO_CLICKED', {
        heroId,
        alreadySelected: this.state.selectedHeroes.has(heroId)
      }, 'debug');
      
      card.classList.toggle('selected');
      const newSelection = new Set(this.state.selectedHeroes);
      
      if (newSelection.size >= 5 && !newSelection.has(heroId)) {
        this.debug.log('SELECTION_LIMIT_REACHED', {
          currentSelection: Array.from(newSelection)
        }, 'debug');
        return;
      }
      
      newSelection.has(heroId) ? 
        newSelection.delete(heroId) : 
        newSelection.add(heroId);
      
      this.state.selectedHeroes = newSelection;
      this.ui.updateHeroSelection(newSelection.size);
      
      this.debug.log('SELECTION_UPDATED', {
        newCount: newSelection.size,
        selectedIds: Array.from(newSelection)
      }, 'debug');
    } catch (error) {
      this.debug.log('HERO_SELECTION_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  async handleDeckConfirmation() {
    try {
      this.debug.log('DECK_CONFIRMATION_STARTED', {
        selectedCount: this.state.selectedHeroes.size
      }, 'info');
      
      if (this.state.selectedHeroes.size !== 5) {
        const error = new Error('Выберите ровно 5 героев!');
        this.debug.log('INVALID_DECK_SIZE', {
          actualSize: this.state.selectedHeroes.size
        }, 'error');
        throw error;
      }

      const deck = Array.from(this.state.selectedHeroes).map(id => {
        const numId = Number(id);
        if (isNaN(numId)) {
          const error = new Error(`Некорректный ID: ${id}`);
          this.debug.log('INVALID_HERO_ID', { id }, 'error');
          throw error;
        }
        return numId;
      });

      const validation = GameLogic.validateDeck(deck, this.state.heroes);
      if (!validation.isValid) {
        this.debug.log('DECK_VALIDATION_FAILED', {
          errors: validation.errors,
          deck
        }, 'error');
        throw new Error(validation.errors.join('\n'));
      }

      this.debug.log('DECK_VALIDATION_SUCCESS', {
        deck,
        validation
      }, 'info');
      
      const response = await this.socket.emit('startPve', deck);
      this.debug.log('SERVER_RESPONSE_RECEIVED', response, 'debug');

      if (response.status === 'success') {
        this.debug.log('GAME_START_SUCCESSFUL', {
          gameId: response.gameState.id,
          initialState: response.gameState
        }, 'info');
        
        this.handleGameState(response.gameState);
      } else {
        this.debug.log('GAME_START_FAILED', {
          response
        }, 'error');
        
        this.ui.showError(response.message || 'Ошибка сервера');
      }
    } catch (error) {
      this.debug.log('DECK_CONFIRMATION_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
      
      this.ui.showError(error.message);
    }
  }

  async endTurn() {
    try {
      if (!this.state.currentGameState?.id) {
        this.debug.log('NO_ACTIVE_GAME', {}, 'error');
        return;
      }
      
      this.debug.log('ENDING_TURN', {
        gameId: this.state.currentGameState.id,
        currentTurn: this.state.currentGameState.currentTurn
      }, 'info');
      
      await this.socket.emit('endTurn', this.state.currentGameState.id);
    } catch (error) {
      this.debug.log('TURN_END_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
      
      this.ui.showError(error.message || 'Ошибка завершения хода');
    }
  }

  handleTurnStart({ timeLeft }) {
    this.debug.log('TURN_START_PROCESSING', {
      timeLeft,
      previousTimer: this.state.turnTimer
    }, 'info');
    
    this.startTurnTimer(timeLeft);
  }

  startTurnTimer(seconds) {
    try {
      this.state.clearTimer();
      let remaining = seconds;
      
      this.debug.log('TIMER_STARTED', {
        initialSeconds: seconds,
        gameId: this.state.currentGameState?.id
      }, 'info');
      
      this.ui.elements.turnTimer.textContent = remaining;
      
      this.state.turnTimer = setInterval(() => {
        remaining--;
        this.ui.elements.turnTimer.textContent = remaining;
        
        if (remaining <= 0) {
          this.debug.log('TIMER_EXPIRED', {
            gameId: this.state.currentGameState?.id
          }, 'info');
          
          this.forceEndTurn();
        }
      }, 1000);
    } catch (error) {
      this.debug.log('TIMER_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  forceEndTurn() {
    this.debug.log('FORCED_TURN_END', {
      gameId: this.state.currentGameState?.id
    }, 'warn');
    
    this.state.clearTimer();
    this.endTurn();
  }

  handleGameOver(result) {
    this.debug.log('GAME_OVER_HANDLING', {
      result,
      finalState: this.state.currentGameState
    }, 'info');
    
    alert(result === 'human' ? 'Победа!' : 'Поражение!');
    this.resetGame();
  }

  resetGame() {
    this.debug.log('RESETTING_GAME', {
      previousState: this.state.currentGameState
    }, 'info');
    
    this.state.reset();
    this.ui.toggleInterface('main');
    this.ui.clearBattlefield();
  }

  // Вспомогательные методы
  getStateDiff(prevState, newState) {
    if (!prevState || !newState) return 'N/A';
    const diffs = {};
    
    Object.keys(newState).forEach(key => {
      if (JSON.stringify(prevState[key]) !== JSON.stringify(newState[key])) {
        diffs[key] = {
          old: prevState[key],
          new: newState[key]
        };
      }
    });
    
    return diffs;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});