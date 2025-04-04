const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
  constructor(playerDeck, abilities) {
    // 1. Вызов super() должен быть ПЕРВЫМ и БЕЗ УСЛОВИЙ
    super();
    
    // 2. Инициализация ВСЕХ полей класса
    this.abilities = {};
    this.combatSystem = null;
    this.players = {};
    this.aiDifficulty = 2;

    try {
      console.log('[PvE] Initialization started');

      // 3. Нормализация данных ПОСЛЕ super()
      this.abilities = this.constructor.normalizeAbilities(abilities);
      this.combatSystem = new CombatSystem();

      // 4. Валидация и нормализация колоды
      const normalizedDeck = this.constructor.normalizeDeck(playerDeck);
      this.validateDeck(normalizedDeck);

      // 5. Инициализация игроков
      this.initializePlayers(normalizedDeck);

      console.log('[PvE] Initialization completed successfully');
    } catch (error) {
      console.error('[PvE CRITICAL ERROR]', {
        error: error.message,
        stack: error.stack,
        input: {
          deck: playerDeck,
          abilities: Object.keys(abilities)
        }
      });
      throw new Error(`Game initialization failed: ${error.message}`);
    }
  }

  // region -------------------- STATIC METHODS --------------------
  static normalizeAbilities(abilities) {
    return Object.entries(abilities).reduce((acc, [key, value]) => {
      const stringKey = String(key);
      acc[stringKey] = {
        id: Number(key),
        name: String(value.name),
        cost: Math.max(1, Number(value.cost || 1)),
        effectType: String(value.effectType),
        target: value.target ? String(value.target) : 'NONE',
        charges: Math.max(1, Number(value.charges || 1)),
        health: Math.max(1, Number(value.health || 1)),
        strength: Math.max(0, Number(value.strength || 0)),
        ...value
      };
      return acc;
    }, {});
  }

  static normalizeDeck(deck) {
    const parsed = typeof deck === 'string' ? JSON.parse(deck) : deck;
    return parsed.map(item => {
      const id = Number(item?.id ?? item);
      if (isNaN(id)) throw new Error(`Invalid ID in deck: ${item}`);
      return id;
    });
  }
  // endregion

  // region -------------------- VALIDATION --------------------
  validateDeck(deck) {
    if (!Array.isArray(deck) || deck.length !== 5) {
      throw new Error(`Invalid deck format: expected 5 cards array`);
    }

    deck.forEach(id => {
      const key = String(id);
      if (!this.abilities[key]) {
        throw new Error(`Ability ${id} (key: ${key}) not found`);
      }
    });
  }
  // endregion

  // region -------------------- PLAYERS INIT --------------------
  initializePlayers(deck) {
    this.players = {
      human: this.createPlayer(deck),
      ai: this.createAIPlayer()
    };
  }

  createPlayer(deck) {
    return {
      deck: deck.map(id => ({ ...this.abilities[String(id)] })),
      hand: [],
      field: [],
      health: 30,
      energy: 0,
      energyPerTurn: 1,
      type: 'human'
    };
  }

  createAIPlayer() {
    return {
      deck: this.generateAIDeck(),
      hand: [],
      field: [],
      health: 30,
      energy: 0,
      energyPerTurn: 1,
      type: 'ai'
    };
  }

  generateAIDeck() {
    const availableIds = Object.keys(this.abilities).map(Number);
    return Array.from({ length: 5 }, () => {
      const randomIndex = Math.floor(Math.random() * availableIds.length);
      return availableIds[randomIndex];
    });
  }
  // endregion
}

module.exports = { PveGame };