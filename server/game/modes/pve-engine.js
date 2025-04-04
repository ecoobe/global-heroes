const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
  constructor(playerDeck, abilities) {
    try {
      console.log('[PvE] Initializing with raw deck:', playerDeck);
      
      // 1. Нормализация колоды перед super()
      const numericDeck = PveGame.staticNormalizeDeck(playerDeck);
      console.log('[PvE] Normalized deck:', numericDeck);

      // 2. Обязательный вызов super() первым
      super({ human: numericDeck, ai: [] }, 'pve');
      console.log('[PvE] Base game initialized');

      // 3. Проверка abilities
      if (!abilities || typeof abilities !== 'object') {
        throw new Error(`Invalid abilities: ${typeof abilities}`);
      }
      console.log('[PvE] Loaded abilities count:', Object.keys(abilities).length);

      // 4. Инициализация систем
      this.combatSystem = new CombatSystem();
      this.abilities = abilities;
      this.aiDifficulty = 2; // Уровень сложности: 1-easy, 2-normal, 3-hard
      
      console.log('[PvE] Initialization completed');
    } catch (error) {
      console.error('[PvE CONSTRUCTOR ERROR]', error.stack);
      throw new Error(`Game initialization failed: ${error.message}`);
    }
  }

  // region ==================== CORE METHODS ====================
  getRequiredDecks() {
    return ['human'];
  }

  initializePlayers(decks) {
    try {
      console.log('[PvE] Initializing players with decks:', {
        human: decks.human.slice(0, 3) + '...',
        ai: decks.ai?.slice(0, 3) + '...'
      });
      
      this.players = {
        human: this.createPlayer(decks.human, 'human'),
        ai: this.createAI()
      };

      console.log('[PvE] Players initialized:', {
        humanCards: this.players.human.deck.length,
        aiCards: this.players.ai.deck.length
      });
    } catch (error) {
      console.error('[INIT PLAYERS ERROR]', error.stack);
      throw new Error(`Players initialization failed: ${error.message}`);
    }
  }
  // endregion

  // region ==================== DECK MANAGEMENT ====================
  static staticNormalizeDeck(deck) {
    try {
      if (!Array.isArray(deck)) {
        throw new Error(`Expected array, got ${typeof deck}`);
      }

      return deck.map((item, index) => {
        // Обработка объектов
        if (item && typeof item === 'object' && item.id) {
          const id = Number(item.id);
          if (isNaN(id)) throw new Error(`Invalid object ID at index ${index}: ${item.id}`);
          return id;
        }

        // Обработка примитивов
        const id = Number(item);
        if (isNaN(id)) throw new Error(`Non-numeric ID at index ${index}: ${item}`);
        
        return id;
      });
    } catch (error) {
      console.error('[DECK NORMALIZATION ERROR]', error.stack);
      throw new Error(`Deck normalization failed: ${error.message}`);
    }
  }

  validateDeck(deck) {
    try {
      console.log('[VALIDATION] Starting deck validation');
      
      return deck.map((item, index) => {
        const id = typeof item === 'object' ? item.id : item;
        const numericId = Number(id);
        
        if (isNaN(numericId)) {
          throw new Error(`Invalid ID at position ${index}: ${id}`);
        }

        const ability = this.abilities[String(numericId)];
        if (!ability) {
          throw new Error(`Ability ${numericId} not found`);
        }

        // Проверка обязательных полей
        const requiredFields = ['name', 'cost', 'effectType'];
        const missing = requiredFields.filter(f => !(f in ability));
        if (missing.length > 0) {
          throw new Error(`Missing fields in ability ${numericId}: ${missing.join(', ')}`);
        }

        // Сборка данных карты
        return {
          id: numericId,
          name: ability.name,
          cost: Math.max(1, Number(ability.cost)),
          effectType: ability.effectType,
          target: ability.target || 'NONE',
          charges: Math.max(1, Number(ability.charges || 1)),
          health: Math.max(1, Number(ability.health || 1)),
          strength: Math.max(0, Number(ability.strength || 0)),
          ...(ability.value && { value: ability.value }),
          ...(ability.modifier && { modifier: ability.modifier }),
          ...(ability.pierce && { pierce: ability.pierce }),
          ...(ability.stat && { stat: ability.stat })
        };
      });
    } catch (error) {
      console.error('[DECK VALIDATION ERROR]', {
        error: error.message,
        deck: deck.slice(0, 3) + '...'
      });
      throw new Error(`Deck validation failed: ${error.message}`);
    }
  }

  createPlayer(deck, type) {
    try {
      console.log(`[PLAYER] Creating ${type} player`);
      return {
        deck: this.validateDeck(deck),
        hand: [],
        field: [],
        health: 30,
        energy: 0,
        energyPerTurn: 1,
        type: type
      };
    } catch (error) {
      console.error('[PLAYER CREATION ERROR]', error.stack);
      throw new Error(`Player creation failed: ${error.message}`);
    }
  }
  // endregion

  // region ==================== AI SYSTEM ====================
  createAI() {
    try {
      console.log('[AI] Initializing AI player');
      return {
        deck: this.generateAIDeck(),
        hand: [],
        field: [],
        health: 30,
        energy: 0,
        energyPerTurn: 1,
        type: 'ai'
      };
    } catch (error) {
      console.error('[AI CREATION ERROR]', error.stack);
      throw new Error(`AI initialization failed: ${error.message}`);
    }
  }

  generateAIDeck() {
    try {
      const availableIds = Object.keys(this.abilities).map(Number);
      console.log('[AI] Available ability IDs:', availableIds);

      const rules = {
        minCost: 1,
        maxCost: 3,
        preferredTypes: ['ATTACK', 'DEFENSE'],
        deckSize: 5
      };

      let candidates = availableIds.filter(id => {
        const ability = this.abilities[id];
        return ability.cost >= rules.minCost && 
               ability.cost <= rules.maxCost &&
               rules.preferredTypes.includes(ability.effectType);
      });

      // Дополнение если недостаточно
      if (candidates.length < rules.deckSize) {
        const rest = availableIds.filter(id => !candidates.includes(id));
        candidates.push(...rest.slice(0, rules.deckSize - candidates.length));
      }

      // Выбор карт
      const selected = [];
      while (selected.length < rules.deckSize && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        selected.push(candidates[idx]);
        candidates.splice(idx, 1);
      }

      console.log('[AI] Generated deck:', selected);
      return selected;
    } catch (error) {
      console.error('[AI DECK ERROR]', error.stack);
      throw new Error(`AI deck generation failed: ${error.message}`);
    }
  }

  processAITurn() {
    try {
      console.log('[AI] Processing AI turn');
      const ai = this.players.ai;
      const playable = ai.hand.filter(card => card.cost <= ai.energy);
      
      if (playable.length === 0) {
        console.log('[AI] No playable cards');
        return this.turnSystem.endTurn();
      }

      const strategy = this.selectAIAction(playable);
      console.log('[AI] Selected strategy:', strategy);

      this.playCard('ai', strategy.cardId);
      
      if (strategy.target) {
        this.combatSystem.resolveAbility(
          this, 
          'ai', 
          strategy.cardId, 
          strategy.target
        );
      }

      this.turnSystem.endTurn();
    } catch (error) {
      console.error('[AI TURN ERROR]', error.stack);
      throw new Error(`AI turn processing failed: ${error.message}`);
    }
  }

  selectAIAction(playableCards) {
    try {
      const priorityMap = {
        'ATTACK': 3,
        'BUFF': 2,
        'DEFENSE': 1
      };

      return playableCards.reduce((best, current) => {
        const ability = this.abilities[current.id];
        const priority = priorityMap[ability.effectType] || 0;
        
        if (priority > best.priority) {
          return {
            cardId: current.id,
            priority: priority,
            target: this.selectTarget(ability)
          };
        }
        return best;
      }, { cardId: null, priority: -1 });
    } catch (error) {
      console.error('[AI STRATEGY ERROR]', error.stack);
      return { cardId: null, priority: -1 };
    }
  }

  selectTarget(ability) {
    try {
      if (!ability.target) return null;
      
      switch(ability.target) {
        case 'WEAKEST_ENEMY':
          return this.findWeakestEnemy();
        case 'RANDOM_ENEMY':
          return this.findRandomEnemy();
        default:
          return null;
      }
    } catch (error) {
      console.error('[TARGET SELECTION ERROR]', error.stack);
      return null;
    }
  }

  findWeakestEnemy() {
    try {
      const targets = this.players.human.field;
      if (targets.length === 0) return null;
      
      return targets.reduce((weakest, current) => {
        return current.health < (weakest?.health || Infinity) ? current : weakest;
      }, null)?.id;
    } catch (error) {
      console.error('[WEAKEST ENEMY ERROR]', error.stack);
      return null;
    }
  }

  findRandomEnemy() {
    try {
      const targets = this.players.human.field;
      if (targets.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * targets.length);
      return targets[randomIndex]?.id;
    } catch (error) {
      console.error('[RANDOM ENEMY ERROR]', error.stack);
      return null;
    }
  }
  // endregion

  // region ==================== GAME ACTIONS ====================
  playCard(playerId, cardId) {
    try {
      console.log(`[ACTION] Playing card ${cardId} for ${playerId}`);
      const player = this.players[playerId];
      
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) {
        throw new Error(`Card ${cardId} not found in hand`);
      }

      const card = player.hand[cardIndex];
      if (player.energy < card.cost) {
        throw new Error(`Not enough energy: ${player.energy}/${card.cost}`);
      }

      // Перемещение карты
      player.hand.splice(cardIndex, 1);
      player.field.push({ ...card });
      player.energy -= card.cost;

      // Активация способности
      this.combatSystem.resolveAbility(
        this,
        playerId,
        card.id,
        this.selectTarget(this.abilities[card.id])
      );

      console.log(`[ACTION] Card played successfully: ${card.name}`);
    } catch (error) {
      console.error('[PLAY CARD ERROR]', error.stack);
      throw new Error(`Card play failed: ${error.message}`);
    }
  }

  onTurnEnd() {
    try {
      console.log('[TURN] Ending turn for:', this.turnSystem.currentTurn);
      
      if (this.players[this.turnSystem.currentTurn].type === 'ai') {
        this.processAITurn();
      }
      
      // Базовая логика окончания хода
      super.onTurnEnd();
    } catch (error) {
      console.error('[TURN END ERROR]', error.stack);
      throw new Error(`Turn end processing failed: ${error.message}`);
    }
  }
  // endregion
}

module.exports = { PveGame };