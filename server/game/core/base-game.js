// server/game/core/base-game.js
const { v4: uuidv4 } = require('uuid');
const { AbilitySystem } = require('./ability-system');
const { TurnSystem } = require('./turn-system');
const { CombatSystem } = require('./combat-system');

class BaseGame {
  constructor(playerDecks, gameType) {
    try {
      console.log('[BASE] Initializing game with decks:', JSON.stringify(playerDecks));
      
      this.id = uuidv4();
      this.gameType = gameType;
      this.status = 'pending';
      
      // 1. Валидация и нормализация колоды
      this.validatedDecks = this.validateDecks(playerDecks);
      console.log('[BASE] Validated decks:', this.validatedDecks);

      // 2. Инициализация систем
      this.abilitySystem = new AbilitySystem();
      this.turnSystem = new TurnSystem(this);
      this.combatSystem = new CombatSystem();
      
      // 3. Инициализация игроков
      this.players = {};
      this.initializePlayers(this.validatedDecks);
      
      this.status = 'active';
      console.log(`[BASE] Game ${this.id} successfully initialized`);

    } catch (error) {
      console.error('[BASE] Initialization failed:', {
        error: error.message,
        stack: error.stack,
        inputDecks: playerDecks
      });
      throw error;
    }
  }

  validateDecks(decks) {
    console.log('[VALIDATION] Starting deck validation');
    
    // 1. Проверка базовой структуры
    if (!Array.isArray(decks)) {
      throw new Error(`Invalid decks format: expected array, got ${typeof decks}`);
    }

    // 2. Преобразование элементов в числовые ID
    const normalized = decks.map((item, index) => {
      try {
        // Обработка объектов с полем id
        if (typeof item === 'object' && item !== null) {
          if (!('id' in item)) {
            throw new Error('Missing id field');
          }
          return Number(item.id);
        }
        
        // Прямая конвертация
        const id = Number(item);
        if (isNaN(id)) {
          throw new Error('Not a number');
        }
        return id;
      } catch (error) {
        console.error(`[VALIDATION] Invalid deck item at index ${index}:`, item);
        throw new Error(`Invalid deck item at position ${index + 1}: ${error.message}`);
      }
    });

    // 3. Проверка размера колоды
    if (normalized.length !== 5) {
      throw new Error(`Invalid deck size: ${normalized.length} (required 5)`);
    }

    // 4. Проверка существования способностей
    const invalidIds = normalized.filter(id => !this.availableAbilities.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid ability IDs: ${invalidIds.join(', ')}`);
    }

    console.log('[VALIDATION] Deck validation successful');
    return normalized;
  }

  initializePlayers(validatedDecks) {
    console.log('[INIT] Initializing players with deck:', validatedDecks);
    
    // Базовая реализация для PvE
    this.players = {
      human: {
        deck: validatedDecks,
        hand: [],
        field: [],
        health: 30,
        energy: 0
      },
      ai: {
        deck: this.generateAiDeck(),
        hand: [],
        field: [],
        health: 30,
        energy: 0
      }
    };
  }

  generateAiDeck() {
    const availableIds = Array.from(this.availableAbilities);
    return Array(5).fill().map(() => 
      availableIds[Math.floor(Math.random() * availableIds.length)]
    );
  }

  get availableAbilities() {
    return new Set(this.validatedDecks);
  }

  getPublicState() {
    return {
      id: this.id,
      status: this.status,
      players: {
        human: this.sanitizePlayer(this.players.human),
        ai: this.sanitizePlayer(this.players.ai)
      },
      currentTurn: this.turnSystem.currentTurn,
      round: this.turnSystem.round
    };
  }

  sanitizePlayer(player) {
    return {
      deckSize: player.deck.length,
      hand: player.hand.length,
      field: player.field.map(unit => ({
        id: unit.id,
        strength: unit.strength,
        health: unit.health
      })),
      health: player.health,
      energy: player.energy
    };
  }

  endGame(reason = 'completed') {
    this.status = 'ended';
    console.log(`[BASE] Game ${this.id} ended. Reason: ${reason}`);
  }
}

module.exports = { BaseGame };