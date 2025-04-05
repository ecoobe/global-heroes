const { v4: uuidv4 } = require('uuid');
const { abilities } = require('./abilities');

class SessionManager {
  createGameSession(socketId, playerDeck) {
    try {
      console.log('[SESSION] Creating game session for:', socketId);
      
      // 1. Проверка наличия abilities
      if (!abilities || typeof abilities !== 'object') {
        throw new Error('Abilities data not loaded');
      }

      // 2. Нормализация с преобразованием ID в строки
      const normalizedDeck = this.normalizeDeck(playerDeck)
        .map(id => String(id)); // Приводим ID к строковому формату

      console.log('[SESSION] Normalized deck (string IDs):', normalizedDeck);
      
      // 3. Проверка существования способностей
      const missingAbilities = normalizedDeck
        .filter(id => !abilities[id])
        .map(id => `ID: ${id}`);

      if (missingAbilities.length > 0) {
        throw new Error(`Missing abilities:\n${missingAbilities.join('\n')}`);
      }

      // 4. Логирование ключей abilities для отладки
      console.log('[SESSION] Available ability keys:', Object.keys(abilities));

      // ... остальная часть метода без изменений

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
    console.log('[NORMALIZATION] Raw deck input:', input);
    
    // Обработка разных форматов
    if (Array.isArray(input)) {
      return input.map(item => 
        typeof item === 'object' ? item.id : item
      ).filter(id => !isNaN(id));
    }
    
    if (input?.player) {
      return input.player.map(item => 
        typeof item === 'object' ? item.id : item
      ).filter(id => !isNaN(id));
    }

    throw new Error(`Invalid deck format: ${typeof input}`);
  }

  generateAiDeck() {
    try {
      const availableIds = Object.keys(abilities)
        .map(Number)
        .filter(id => !isNaN(id));

      console.log('[AI] Available ability IDs:', availableIds);
      
      // Фишер-Йейтс shuffle
      const shuffled = [...availableIds];
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
    return this.sessions.get(sessionId);
  }

  getGameData(gameId) {
    return this.games.get(gameId) || null;
  }

  destroySession(sessionId) {
    try {
      const gameId = this.sessions.get(sessionId);
      if (!gameId) return;

      console.log(`[SESSION] Destroying session ${sessionId}`);
      this.sessions.delete(sessionId);
      this.games.delete(gameId);
      
    } catch (error) {
      console.error('[SESSION] Destruction failed:', error);
    }
  }
}

module.exports = SessionManager;