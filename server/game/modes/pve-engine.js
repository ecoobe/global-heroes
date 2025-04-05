const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
	constructor(playerDeck, abilities) {
	  try {
		console.log('[PvE] Initialization started');

		// 🛠️ Правильная передача данных в BaseGame
		super({ player: playerDeck }, 'pve'); // <-- Передаем объект с ключом "player"

		console.log('[PvE] Base game initialized');

		// 2. Принудительная нормализация данных
		const normalizedAbilities = this.constructor.normalizeAbilities(abilities);
		const normalizedDeck = this.constructor.normalizeDeck(playerDeck);

		// 3. Сохранение критических данных
		this.abilities = normalizedAbilities;
		this.combatSystem = new CombatSystem();
		this.aiDifficulty = 2;

		// 4. Глубокая валидация
		this.validateInitialData(normalizedDeck);

		// 5. Инициализация игроков
		this.players = {
		  human: this.createHumanPlayer(normalizedDeck),
		  ai: this.createAIPlayer()
		};

		console.log('[PvE] Game fully initialized');
	  } catch (error) {
		console.error('[CRITICAL ERROR]', {
		  message: error.message,
		  stack: error.stack,
		  inputDeck: playerDeck,
		  abilitiesKeys: Object.keys(abilities || {})
		});
		throw new Error(`Game initialization failed: ${error.message}`);
	  }
	}


  // region -------------------- STATIC METHODS --------------------
  static normalizeDeck(deck) {
    try {
      console.log('[DECK] Raw input:', deck);

      // Обработка строкового формата
      const parsedDeck = typeof deck === 'string' 
        ? JSON.parse(deck) 
        : deck;

      // Преобразование в массив
      const deckArray = Array.isArray(parsedDeck) 
        ? parsedDeck 
        : [parsedDeck];

      // Конвертация в числовые ID
      return deckArray.map(item => {
        // Извлечение ID из объектов
        if (item && typeof item === 'object' && item.id) {
          const id = Number(item.id);
          if (isNaN(id)) throw new Error(`Invalid object ID: ${item.id}`);
          return id;
        }

        // Прямая конвертация
        const id = Number(item);
        if (isNaN(id)) throw new Error(`Invalid ID format: ${item}`);
        
        return id;
      });
    } catch (error) {
      throw new Error(`Deck normalization failed: ${error.message}`);
    }
  }

  static normalizeAbilities(abilities) {
    try {
      console.log('[ABILITIES] Raw input keys:', Object.keys(abilities));

      return Object.entries(abilities).reduce((acc, [key, value]) => {
        const stringKey = String(key);
        
        // Валидация структуры
        const requiredFields = ['id', 'name', 'cost', 'effectType'];
        const missingFields = requiredFields.filter(f => !(f in value));
        if (missingFields.length > 0) {
          throw new Error(`Ability ${stringKey} missing fields: ${missingFields.join(', ')}`);
        }

        // Создание нормализованного объекта
        acc[stringKey] = {
          id: Number(value.id),
          name: String(value.name),
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
      throw new Error(`Abilities normalization failed: ${error.message}`);
    }
  }
  // endregion

  // region -------------------- VALIDATION --------------------
  validateInitialData(deck) {
    console.log('[VALIDATION] Starting comprehensive check');
    
    // Проверка существования всех способностей
    deck.forEach(id => {
      const key = String(id);
      if (!this.abilities[key]) {
        throw new Error(`Ability not found: ${id} (checked key: ${key})`);
      }
    });

    // Дополнительные проверки
    if (!Array.isArray(deck)) {
      throw new Error(`Deck must be array, got ${typeof deck}`);
    }
    
    if (deck.length !== 5) {
      throw new Error(`Invalid deck size: ${deck.length} (required 5)`);
    }
  }
  // endregion

  // region -------------------- PLAYER MANAGEMENT --------------------
  createHumanPlayer(deck) {
    try {
      console.log('[PLAYER] Creating human player');

      const cards = deck.map(id => {
        const key = String(id);
        const ability = this.abilities[key];
        
        return {
          id: ability.id,
          name: ability.name,
          cost: ability.cost,
          effectType: ability.effectType,
          target: ability.target,
          charges: ability.charges,
          health: ability.health,
          strength: ability.strength,
          ...(ability.value && { value: ability.value }),
          ...(ability.modifier && { modifier: ability.modifier }),
          ...(ability.pierce && { pierce: ability.pierce })
        };
      });

      return {
        deck: cards,
        hand: [],
        field: [],
        health: 30,
        energy: 0,
        energyPerTurn: 1,
        type: 'human'
      };
    } catch (error) {
      throw new Error(`Human player creation failed: ${error.message}`);
    }
  }

  createAIPlayer() {
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
      throw new Error(`AI player creation failed: ${error.message}`);
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

      // Фильтрация по правилам
      let candidates = availableIds.filter(id => {
        const ability = this.abilities[String(id)];
        return ability.cost >= rules.minCost && 
               ability.cost <= rules.maxCost &&
               rules.preferredTypes.includes(ability.effectType);
      });

      // Дополнение при необходимости
      if (candidates.length < rules.deckSize) {
        const rest = availableIds.filter(id => !candidates.includes(id));
        candidates.push(...rest.slice(0, rules.deckSize - candidates.length));
      }

      // Рандомизация выбора
      const selected = [];
      while (selected.length < rules.deckSize && candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        selected.push(candidates[randomIndex]);
        candidates.splice(randomIndex, 1);
      }

      console.log('[AI] Generated deck:', selected);
      return selected;
    } catch (error) {
      throw new Error(`AI deck generation failed: ${error.message}`);
    }
  }
  // endregion

  // region -------------------- GAME LOGIC --------------------
  processAITurn() {
    try {
      console.log('[AI] Processing turn');
      
      const ai = this.players.ai;
      const playableCards = ai.hand.filter(card => card.cost <= ai.energy);
      
      if (playableCards.length === 0) {
        console.log('[AI] No playable cards');
        return this.endTurn();
      }

      const strategy = this.selectAIStrategy(playableCards);
      console.log('[AI] Selected strategy:', strategy);

      this.playCard('ai', strategy.cardId, strategy.target);
    } catch (error) {
      console.error('[AI TURN ERROR]', error.stack);
      throw new Error(`AI turn processing failed: ${error.message}`);
    }
  }

  selectAIStrategy(cards) {
    const priorityMap = {
      'ATTACK': 3,
      'BUFF': 2,
      'DEFENSE': 1
    };

    return cards.reduce((best, current) => {
      const ability = this.abilities[String(current.id)];
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
  }

  playCard(playerId, cardId, target) {
    try {
      console.log(`[ACTION] Playing card ${cardId} for ${playerId}`);
      
      const player = this.players[playerId];
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      
      if (cardIndex === -1) throw new Error(`Card ${cardId} not in hand`);
      if (player.energy < player.hand[cardIndex].cost) {
        throw new Error(`Insufficient energy: ${player.energy}/${player.hand[cardIndex].cost}`);
      }

      const playedCard = player.hand.splice(cardIndex, 1)[0];
      player.field.push(playedCard);
      player.energy -= playedCard.cost;

      this.combatSystem.resolveAbility(
        this,
        playerId,
        playedCard.id,
        target
      );
    } catch (error) {
      console.error('[PLAY CARD ERROR]', error.stack);
      throw new Error(`Card play failed: ${error.message}`);
    }
  }

  endTurn() {
    console.log('[TURN] Ending current turn');
    // Логика окончания хода
  }
  // endregion
}

module.exports = { PveGame };