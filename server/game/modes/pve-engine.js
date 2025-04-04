const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
	constructor(playerDeck, abilities) {
	  console.log('Initializing PvE with abilities:', abilities);
	  super({ human: playerDeck }, 'pve');
	  if (!abilities) throw new Error('Abilities not provided');
	  console.log('Abilities on PvE init:', Object.keys(abilities));
	  super({ human: playerDeck, ai: [] }, 'pve'); // AI deck пустой
	  this.combatSystem = new CombatSystem();
	  this.abilities = abilities;
	}  

  getRequiredDecks() {
	  return ['human']; // Требуется только колода игрока
  }

  initializePlayers(decks) {
    this.players = {
      human: this.createPlayer(decks.human, 'human'),
      ai: this.createAI() // Генерация AI
    };
  }

  validateDeck(deck) {
	console.log('[DEBUG] Starting deck validation with abilities:', this.abilities);
	
	return deck.map(id => {
	  console.log('[DEBUG] Processing card ID:', id, 'Type:', typeof id);
	  
	  // Явное преобразование ID к строке
	  const abilityKey = String(id);
	  const ability = this.abilities[abilityKey];
	  
	  console.log('[DEBUG] Ability data:', ability);
  
	  // Усиленные проверки
	  if (!ability) {
		throw new Error(`Ability not found for ID: ${id} (key: ${abilityKey})`);
	  }
  
	  if (typeof ability !== 'object' || Array.isArray(ability)) {
		throw new Error(`Invalid ability type for ID ${id}: ${typeof ability}`);
	  }
  
	  // Проверка обязательных полей
	  const requiredFields = ['name', 'cost', 'effectType'];
	  const missingFields = requiredFields.filter(field => !(field in ability));
	  
	  if (missingFields.length > 0) {
		throw new Error(`Missing fields in ability ${id}: ${missingFields.join(', ')}`);
	  }
  
	  // Возвращаем нормализованные данные
	  return {
		id: Number(id),
		name: ability.name,
		cost: Number(ability.cost) || 1,
		charges: Number(ability.charges) || 1,
		effectType: ability.effectType,
		target: ability.target || 'NONE',
		stats: {
		  strength: Number(ability.strength) || 0,
		  health: Number(ability.health) || 1
		}
	  };
	});
  }

  createAI() {
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
	// Получаем все доступные ID способностей
	const availableIds = Object.keys(this.abilities).map(Number);
	
	// Базовые правила для AI:
	const aiDeckRules = {
	  minCost: 1,
	  maxCost: 3,
	  preferredTypes: ['ATTACK', 'DEFENSE'],
	  deckSize: 5
	};
  
	// Фильтруем подходящие способности
	const suitableAbilities = availableIds.filter(id => {
	  const ability = this.abilities[id];
	  return ability.cost >= aiDeckRules.minCost && 
			 ability.cost <= aiDeckRules.maxCost &&
			 aiDeckRules.preferredTypes.includes(ability.effectType);
	});
  
	// Если подходящих недостаточно - добавляем любые
	if (suitableAbilities.length < aiDeckRules.deckSize) {
	  const remainingIds = availableIds.filter(id => !suitableAbilities.includes(id));
	  suitableAbilities.push(...remainingIds.slice(0, aiDeckRules.deckSize - suitableAbilities.length));
	}
  
	// Выбираем случайные карты
	const selectedCards = [];
	while (selectedCards.length < aiDeckRules.deckSize && suitableAbilities.length > 0) {
	  const randomIndex = Math.floor(Math.random() * suitableAbilities.length);
	  selectedCards.push(suitableAbilities[randomIndex]);
	  suitableAbilities.splice(randomIndex, 1); // Удаляем чтобы не дублировать
	}
  
	// Дополняем колоду если всё ещё не хватает
	while (selectedCards.length < aiDeckRules.deckSize) {
	  selectedCards.push(availableIds[Math.floor(Math.random() * availableIds.length)]);
	}
  
	return selectedCards.slice(0, aiDeckRules.deckSize);
  }

  getDifficultyLevel() {
    return ['easy', 'normal', 'hard'][this.aiDifficulty - 1];
  }

  selectCards(preferred, all, size) {
    const deck = [];
    
    // Пытаемся взять предпочитаемые карты
    while (deck.length < size && preferred.length > 0) {
      const idx = Math.floor(Math.random() * preferred.length);
      deck.push(preferred.splice(idx, 1)[0]);
    }

    // Добираем из общих
    while (deck.length < size && all.length > 0) {
      const idx = Math.floor(Math.random() * all.length);
      const card = all.splice(idx, 1)[0];
      if (!deck.includes(card)) deck.push(card);
    }

    return deck.slice(0, size);
  }

  createPlayer(deck, type) {
    return {
      deck: this.validateDeck(deck),
      hand: [],
      field: [],
      health: 30,
      energy: 0,
      energyPerTurn: 1,
      type: type
    };
  }

  onTurnEnd() {
    if (this.players[this.turnSystem.currentTurn].type === 'ai') {
      this.processAITurn();
    }
  }

  processAITurn() {
    const ai = this.players.ai;
    const playable = ai.hand.filter(c => c.cost <= ai.energy);
    
    if (playable.length > 0) {
      const strategy = this.selectAIAction(playable);
      this.playCard('ai', strategy.cardId);
      
      if (strategy.target) {
        this.combatSystem.resolveAbility(
          this, 
          'ai', 
          strategy.cardId, 
          strategy.target
        );
      }
    }
    
    this.turnSystem.endTurn();
  }

  selectAIAction(cards) {
    const priorities = {
      'ATTACK': 3,
      'BUFF': 2,
      'DEFENSE': 1
    };

    const bestCard = cards.reduce((best, current) => {
      const currentPriority = priorities[this.abilities[current.id].effectType] || 0;
      return currentPriority > best.priority ? 
        { cardId: current.id, priority: currentPriority } : 
        best;
    }, { cardId: null, priority: -1 });

    return {
      cardId: bestCard.cardId,
      target: this.selectTarget(this.abilities[bestCard.cardId])
    };
  }

  selectTarget(ability) {
    switch(ability.target) {
      case 'WEAKEST_ENEMY':
        return this.findWeakestEnemy();
      case 'RANDOM_ENEMY':
        return this.findRandomEnemy();
      default:
        return null;
    }
  }

  findWeakestEnemy() {
    return this.players.human.field
      .reduce((weakest, current) => 
        current.health < (weakest?.health || Infinity) ? current : weakest, null)?.id;
  }

  playCard(playerId, cardId) {
    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) return;
    if (player.energy < player.hand[cardIndex].cost) return;

    const card = player.hand.splice(cardIndex, 1)[0];
    player.field.push({ ...card });
    player.energy -= card.cost;
    
    this.abilitySystem.activateAbility(this, playerId, card.id);
  }
}

module.exports = { PveGame };