const { v4: uuidv4 } = require('uuid');
const { abilities } = require('./abilities');

class SessionManager {
  constructor() {
    if (!abilities || typeof abilities !== 'object') {
      throw new Error('Abilities must be initialized first');
    }
    this.sessions = new Map(); // sessionId -> gameId
    this.games = new Map(); // gameId -> gameData
    console.log('[SESSION] Manager initialized with abilities:', Object.keys(abilities));
  }

  createGameSession(socketId, playerDeck) {
    try {
      console.log(`[SESSION] Creating session for ${socketId}`, { rawDeck: playerDeck });

      // 1. Нормализация колоды
      const normalizedDeck = this.normalizeDeck(playerDeck);
      console.log('[SESSION] Normalized deck:', normalizedDeck);

      // 2. Валидация способностей
      this.validateAbilities(normalizedDeck);

      // 3. Создание игровой сессии
      const { sessionId, gameId } = this.createSessionRecord(socketId, normalizedDeck);

      console.log(`[SESSION] Created session ${sessionId} for game ${gameId}`);
      return { sessionId, gameId, socketId };

    } catch (error) {
      console.error('[SESSION] Creation failed:', {
        error: error.message,
        inputDeck: playerDeck,
        stack: error.stack
      });
      throw error;
    }
  }

  normalizeDeck(input) {
    try {
      console.log('[NORMALIZATION] Raw deck input:', JSON.stringify(input));

      // Извлечение базовых ID
      const baseDeck = this.extractBaseDeck(input);

      // Преобразование в строковые ID и фильтрация
      return baseDeck
        .map(item => String(typeof item === 'object' ? item?.id : item))
        .filter(id => id in abilities);
      
    } catch (error) {
      throw new Error(`Deck normalization failed: ${error.message}`);
    }
  }

  extractBaseDeck(input) {
    if (Array.isArray(input)) return input;
    if (input?.player && Array.isArray(input.player)) return input.player;
    throw new Error('Unsupported deck format');
  }

  validateAbilities(deckIds) {
    const missing = deckIds.filter(id => !(id in abilities));
    if (missing.length > 0) {
      throw new Error(`Missing abilities for IDs: ${missing.join(', ')}`);
    }
  }

  createSessionRecord(socketId, deck) {
    const sessionId = uuidv4();
    const gameId = uuidv4();

    this.sessions.set(sessionId, { gameId, socketId });

    this.games.set(gameId, {
      players: {
        human: { 
          deck: deck,
          socketId: socketId
        },
        ai: {
          deck: this.generateAiDeck(),
          socketId: 'AI_' + uuidv4()
        }
      },
      state: 'active',
      timestamp: Date.now()
    });

    return { sessionId, gameId };
  }

  generateAiDeck() {
    try {
      const abilityIds = Object.keys(abilities)
        .map(Number)
        .filter(id => !isNaN(id));

      console.log('[AI] Available ability IDs:', abilityIds);

      // Фишер-Йейтс shuffle
      const shuffled = [...abilityIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled.slice(0, 5);
    } catch (error) {
      console.error('[AI] Deck generation failed:', error);
      return [1, 2, 3, 4, 5]; // Fallback deck
    }
  }

  getGameId(sessionId) {
    return this.sessions.get(sessionId)?.gameId || null;
  }

  getGameData(gameId) {
    return this.games.get(gameId) || null;
  }

  destroySession(sessionId) {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) return;

      console.log(`[SESSION] Destroying session ${sessionId}`);
      this.sessions.delete(sessionId);
      this.games.delete(sessionData.gameId);
      
    } catch (error) {
      console.error('[SESSION] Destruction failed:', error);
    }
  }
}

module.exports = SessionManager;