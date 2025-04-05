const { v4: uuidv4 } = require('uuid');
const abilities = Object.freeze(
	Object.entries({
	  1: { id: 1, name: "Месть клинка", cost: 2, effectType: "DEATH", target: "RANDOM_ENEMY", value: 4 },
	  2: { id: 2, name: "Невидимость", cost: 1, effectType: "PASSIVE", trigger: "FIRST_ATTACK" },
	  3: { id: 3, name: "Тактик", cost: 3, effectType: "BUFF", target: "ALL_ALLIES", stat: "strength", value: 1 },
	  4: { id: 4, name: "Стрела Луны", cost: 2, effectType: "ATTACK", target: "WEAKEST_ENEMY", pierce: true },
	  5: { id: 5, name: "Щит предков", cost: 2, effectType: "DEFENSE", modifier: -2 }
	}).reduce((acc, [key, value]) => {
	  const validated = {
		id: Number(key),
		name: String(value.name),
		cost: Math.max(1, Number(value.cost)),
		effectType: String(value.effectType),
		...value
	  };
	  acc[String(key)] = Object.freeze(validated);
	  return acc;
	}, {})
);

class SessionManager {
  constructor() {
    // Проверка инициализации abilities
    if (!abilities || typeof abilities !== 'object') {
      throw new Error('[FATAL] Abilities not initialized');
    }

    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map();    // gameId -> gameData
    console.log('[SESSION] Manager initialized with', Object.keys(abilities).length, 'abilities');
  }

  // region -------------------- CORE METHODS --------------------
  createGameSession(socketId, playerDeck) {
    try {
      console.log(`[SESSION] Creating session for ${socketId}`);

      // 1. Нормализация колоды
      const normalizedDeck = this.normalizeDeck(playerDeck);
      console.log('[SESSION] Normalized deck:', normalizedDeck);

      // 2. Валидация способностей
      this.validateAbilities(normalizedDeck);

      // 3. Создание сессии
      const gameId = uuidv4();
      const sessionId = uuidv4();

      this.sessions.set(sessionId, gameId);
      this.games.set(gameId, {
        players: {
          human: {
            deck: normalizedDeck,
            socketId: socketId,
            health: 30,
            energy: 0
          },
          ai: {
            deck: this.generateAiDeck(),
            socketId: `AI_${uuidv4()}`,
            health: 30,
            energy: 0
          }
        },
        state: 'active',
        created: new Date().toISOString(),
        lastActivity: Date.now()
      });

      console.log(`[SESSION] Created session ${sessionId}`);
      return { sessionId, gameId };

    } catch (error) {
      console.error('[SESSION] Creation failed:', {
        error: error.message,
        inputDeck: playerDeck,
        stack: error.stack
      });
      throw error;
    }
  }

  destroySession(sessionId) {
    try {
      const gameId = this.sessions.get(sessionId);
      if (!gameId) return;

      console.log(`[SESSION] Destroying ${sessionId}`);
      this.sessions.delete(sessionId);
      this.games.delete(gameId);

    } catch (error) {
      console.error('[SESSION] Destruction error:', error);
    }
  }
  // endregion

  // region -------------------- DECK MANAGEMENT --------------------
  normalizeDeck(input) {
    try {
      // Обработка разных форматов ввода
      const rawDeck = this.extractRawDeck(input);
      
      return rawDeck
        .map(item => {
          // Извлечение ID из объектов
          if (typeof item === 'object' && item.id) {
            return String(item.id);
          }
          return String(item);
        })
        .filter(id => {
          // Фильтрация валидных ID
          const isValid = id in abilities;
          if (!isValid) console.warn(`[VALIDATION] Invalid ability ID: ${id}`);
          return isValid;
        });
    } catch (error) {
      throw new Error(`Deck normalization failed: ${error.message}`);
    }
  }

  extractRawDeck(input) {
    if (Array.isArray(input)) return input;
    if (input?.player && Array.isArray(input.player)) return input.player;
    throw new Error('Invalid deck structure');
  }

  validateAbilities(deckIds) {
    const missing = deckIds.filter(id => !(id in abilities));
    if (missing.length > 0) {
      throw new Error(`Missing abilities for: ${missing.join(', ')}`);
    }

    if (deckIds.length !== 5) {
      throw new Error(`Invalid deck size: ${deckIds.length}/5`);
    }
  }

  generateAiDeck() {
    try {
      const abilityIds = Object.keys(abilities);
      if (abilityIds.length < 5) {
        throw new Error('Not enough abilities for AI deck');
      }

      // Алгоритм Фишера-Йейтса
      const shuffled = [...abilityIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled.slice(0, 5);
    } catch (error) {
      console.error('[AI] Deck generation error:', error);
      return ['1', '2', '3', '4', '5']; // Fallback
    }
  }
  // endregion

  // region -------------------- UTILITIES --------------------
  getGameId(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getGameData(gameId) {
    return this.games.get(gameId) || null;
  }

  getAllSessions() {
    return Array.from(this.sessions.entries());
  }

  cleanupInactiveSessions(maxInactiveTime = 3600000) {
    const now = Date.now();
    Array.from(this.games.entries()).forEach(([gameId, game]) => {
      if (now - game.lastActivity > maxInactiveTime) {
        console.log(`[CLEANUP] Removing inactive game ${gameId}`);
        this.games.delete(gameId);
      }
    });
  }
  // endregion
}

module.exports = SessionManager;