const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');
const { v4: uuidv4 } = require('uuid');

class PveGame extends BaseGame {
  constructor(playerDeck, abilities) {
    try {
      const initLog = {
        phase: 'initialization',
        input: { deckType: typeof playerDeck, abilitiesCount: Object.keys(abilities || {}).length }
      };
      
      console.log('[PvE][🛠] Initialization started', initLog);
      super({ player: playerDeck }, 'pve');

      this.id = uuidv4();
      this.round = 1;
      this.currentTurn = 'human';
      this.combatSystem = new CombatSystem();
      this.aiDifficulty = 2;

      console.log('[PvE][✅] Base initialized', {
        gameId: this.id,
        superInitialized: !!this.players
      });

      // Нормализация данных
      const normalizationLog = {};
      this.abilities = this.constructor.normalizeAbilities(abilities, normalizationLog);
      const normalizedDeck = this.constructor.normalizeDeck(playerDeck, normalizationLog);
      
      console.log('[PvE][🔍] Normalization report:', {
        ...normalizationLog,
        deckSample: normalizedDeck.slice(0, 3)
      });

      this.validateInitialData(normalizedDeck);

      // Инициализация игроков
      this.players = {
        human: this.createHumanPlayer(normalizedDeck) || this._createDefaultPlayer(),
        ai: this.createAIPlayer() || this._createDefaultPlayer()
      };

      console.log('[PvE][🎮] Game ready', {
        gameId: this.id,
        human: this._safePlayerLog(this.players.human),
        ai: this._safePlayerLog(this.players.ai)
      });

    } catch (error) {
      console.error('[PvE][💥] Init failed', {
        error: this._safeError(error),
        inputSample: this._truncateLog(playerDeck)
      });
      throw new Error(`Game init failed: ${error.message}`);
    }
  }

  // region ==================== CORE METHODS ====================
  getPublicState() {
    const safeGet = (obj, prop, def) => obj?.[prop] ?? def;
    
    const state = {
      id: this.id,
      human: {
        health: safeGet(this.players.human, 'health', 30),
        deck: safeGet(this.players.human, 'deck', []),
        hand: safeGet(this.players.human, 'hand', []),
        field: safeGet(this.players.human, 'field', []),
        energy: safeGet(this.players.human, 'energy', 0)
      },
      ai: {
        health: safeGet(this.players.ai, 'health', 30),
        deck: safeGet(this.players.ai, 'deck', []),
        field: safeGet(this.players.ai, 'field', []),
        energy: safeGet(this.players.ai, 'energy', 0)
      },
      currentTurn: this.currentTurn,
      round: this.round
    };

    console.log('[PvE][📤] State snapshot', this._truncateLog(state));
    return state;
  }

  endTurn() {
    const turnLog = {
      gameId: this.id,
      prevTurn: this.currentTurn,
      humanEnergy: this.players.human?.energy,
      aiEnergy: this.players.ai?.energy
    };

    try {
      console.log('[TURN][⏭] Ending turn', turnLog);
      
      super.endTurn();
      this.round++;
      this._processNextTurn();

      console.log('[TURN][✅] Turn completed', {
        newTurn: this.currentTurn,
        newRound: this.round
      });

    } catch (error) {
      console.error('[TURN][💥] Turn error', {
        ...turnLog,
        error: this._safeError(error)
      });
      throw error;
    }
  }
  // endregion

  // region ==================== PLAYER MANAGEMENT ====================
  createHumanPlayer(deck) {
    try {
      console.log('[PLAYER][👤] Creating human', { deckSize: deck?.length });

      const cards = deck.map(id => {
        const ability = this.abilities[String(id)] || this._defaultAbility(id);
        return {
          id: ability.id,
          name: ability.name,
          cost: ability.cost,
          effectType: ability.effectType,
          target: ability.target,
          charges: ability.charges,
          health: ability.health,
          strength: ability.strength,
          ...(ability.value && { value: ability.value })
        };
      });

      return {
        deck: cards,
        hand: [],
        field: [],
        health: 30,
        energy: 0,
        energyPerTurn: 1
      };

    } catch (error) {
      console.error('[PLAYER][💥] Human creation failed', {
        error: this._safeError(error),
        deckSample: deck?.slice(0, 3)
      });
      return null;
    }
  }

  createAIPlayer() {
    try {
      console.log('[PLAYER][🤖] Creating AI');
      
      return {
        deck: this.generateAIDeck(),
        hand: [],
        field: [],
        health: 30,
        energy: 0,
        energyPerTurn: 1
      };

    } catch (error) {
      console.error('[PLAYER][💥] AI creation failed', {
        error: this._safeError(error)
      });
      return null;
    }
  }

  generateAIDeck() {
    try {
      const availableIds = Object.keys(this.abilities).map(Number);
      const rules = {
        minCost: 1,
        maxCost: 3,
        preferredTypes: ['ATTACK', 'DEFENSE'],
        deckSize: 5
      };

      console.log('[AI][🃏] Deck generation', {
        available: availableIds.length,
        rules
      });

      let candidates = availableIds.filter(id => {
        const ability = this.abilities[String(id)] || {};
        return ability.cost >= rules.minCost && 
               ability.cost <= rules.maxCost &&
               rules.preferredTypes.includes(ability.effectType);
      });

      // Логика выбора карт...
      const selected = this._selectAICards(candidates, rules.deckSize);

      console.log('[AI][✅] Deck generated', { selected });
      return selected;

    } catch (error) {
      console.error('[AI][💥] Deck generation failed', {
        error: this._safeError(error)
      });
      return [];
    }
  }
  // endregion

  // region ==================== STATIC METHODS ====================
  static normalizeDeck(deck, log = {}) {
    try {
      log.originalType = typeof deck;
      log.originalLength = deck?.length;

      const parsedDeck = typeof deck === 'string' ? 
        JSON.parse(deck) : 
        Array.isArray(deck) ? deck : [deck];

      const normalized = parsedDeck.map((item, i) => {
        const id = Number(item?.id ?? item);
        if (isNaN(id)) throw new Error(`Invalid ID at index ${i}: ${item}`);
        return id;
      });

      log.normalized = normalized.slice(0, 5);
      return normalized;

    } catch (error) {
      log.error = this._safeError(error);
      throw new Error(`Deck normalization failed: ${error.message}`);
    }
  }

  static normalizeAbilities(abilities, log = {}) {
    try {
      log.originalCount = Object.keys(abilities || {}).length;

      return Object.entries(abilities).reduce((acc, [key, value]) => {
        const stringKey = String(key);
        const required = ['id', 'name', 'cost', 'effectType'];
        const missing = required.filter(f => !(f in value));

        if (missing.length > 0) {
          log.missingFields = log.missingFields || [];
          log.missingFields.push({ key: stringKey, missing });
          return acc;
        }

        acc[stringKey] = {
          id: Number(value.id),
          name: String(value.name).substring(0, 25),
          cost: Math.max(1, Number(value.cost)),
          effectType: String(value.effectType),
          target: value.target ? String(value.target) : 'NONE',
          charges: Math.max(1, Number(value.charges || 1)),
          health: Math.max(1, Number(value.health || 1)),
          strength: Math.max(0, Number(value.strength || 0)),
          ...(value.value !== undefined && { value: Number(value.value) }),
          ...(value.modifier !== undefined && { modifier: Number(value.modifier) }),
          ...(value.pierce !== undefined && { pierce: Boolean(value.pierce) })
        };

        return acc;
      }, {});

    } catch (error) {
      log.error = this._safeError(error);
      throw new Error(`Abilities normalization failed: ${error.message}`);
    }
  }
  // endregion

  // region ==================== HELPERS ====================
  _createDefaultPlayer() {
    return {
      health: 30,
      deck: [],
      hand: [],
      field: [],
      energy: 0,
      energyPerTurn: 1
    };
  }

  _safeError(error) {
    return {
      message: error.message,
      stack: error.stack.split('\n').slice(0, 3).join(' | ')
    };
  }

  _truncateLog(data, maxLength = 3) {
    if (Array.isArray(data)) {
      return data.slice(0, maxLength);
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = this._truncateLog(data[key], maxLength);
        return acc;
      }, {});
    }
    return data;
  }

  _safePlayerLog(player) {
    return {
      health: player?.health ?? 'N/A',
      deckSize: player?.deck?.length ?? 0,
      fieldSize: player?.field?.length ?? 0
    };
  }

  _defaultAbility(id) {
    console.warn('[⚠️] Using default ability for ID:', id);
    return {
      id: Number(id),
      name: 'Unknown Ability',
      cost: 1,
      effectType: 'NONE',
      target: 'NONE',
      charges: 1,
      health: 1,
      strength: 0
    };
  }

  _processNextTurn() {
    if (this.currentTurn === 'ai') return;
    
    console.log('[TURN][🤖] Processing AI turn');
    try {
      this.processAITurn();
    } catch (error) {
      console.error('[AI][💥] Turn processing failed', {
        error: this._safeError(error)
      });
    }
  }

  _selectAICards(candidates, deckSize) {
    const selected = [];
    while (selected.length < deckSize && candidates.length > 0) {
      const index = Math.floor(Math.random() * candidates.length);
      selected.push(candidates[index]);
      candidates.splice(index, 1);
    }
    return selected;
  }
}

module.exports = { PveGame };