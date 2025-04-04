const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
  constructor(playerDeck, abilities) {
    if (!abilities) throw new Error('Abilities not provided');
    
    const numericDeck = this.normalizeDeck(playerDeck);
    super({ 
      human: numericDeck,
      ai: [] 
    }, 'pve');
    
    this.combatSystem = new CombatSystem();
    this.abilities = abilities;

    console.log('[PvE] Initialized:', {
      deck: numericDeck,
      abilities: Object.keys(this.abilities)
    });
  }

  //region Core Methods
  getRequiredDecks() {
    return ['human'];
  }

  initializePlayers(decks) {
    this.players = {
      human: this.createPlayer(decks.human, 'human'),
      ai: this.createAI()
    };
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
  //endregion

  //region Deck Validation
  normalizeDeck(deck) {
    if (!Array.isArray(deck)) {
      throw new Error(`Invalid deck format: ${typeof deck}`);
    }

    return deck.map(item => {
      if (typeof item === 'object' && item.id) {
        return Number(item.id);
      }
      if (typeof item === 'string' && !isNaN(item)) {
        return parseInt(item, 10);
      }
      if (typeof item !== 'number') {
        throw new Error(`Invalid card ID type: ${typeof item} (${item})`);
      }
      return item;
    });
  }

  validateDeck(deck) {
    console.log('[VALIDATE] Starting validation. Abilities:', Object.keys(this.abilities));
    
    return deck.map(item => {
      const rawId = typeof item === 'object' ? item.id : item;
      const id = Number(rawId);
      
      if (isNaN(id)) {
        throw new Error(`Invalid card ID: ${rawId}`);
      }

      const abilityKey = String(id);
      const ability = this.abilities[abilityKey];
      
      if (!ability) {
        throw new Error(`Ability ${id} (key: ${abilityKey}) not found`);
      }

      if (typeof ability !== 'object' || Array.isArray(ability)) {
        console.error('Corrupted ability:', ability);
        throw new Error(`Invalid ability structure for ID ${id}`);
      }

      const requiredFields = ['name', 'cost', 'effectType'];
      const missingFields = requiredFields.filter(f => !(f in ability));
      if (missingFields.length > 0) {
        throw new Error(`Missing fields for ${id}: ${missingFields.join(', ')}`);
      }

      return this.buildCardData(id, ability);
    });
  }

  buildCardData(id, ability) {
    const cardData = {
      id: id,
      name: ability.name || 'Unnamed Card',
      cost: Math.max(1, Number(ability.cost)),
      effectType: ability.effectType,
      target: ability.target || 'NONE',
      charges: Math.max(1, Number(ability.charges || 1)),
      health: Math.max(1, Number(ability.health || 1)),
      strength: Math.max(0, Number(ability.strength || 0)),
      ...(ability.value !== undefined && { value: ability.value }),
      ...(ability.modifier !== undefined && { modifier: ability.modifier }),
      ...(ability.pierce !== undefined && { pierce: ability.pierce }),
      ...(ability.stat !== undefined && { stat: ability.stat })
    };

    console.log('[VALIDATE] Processed card:', cardData);
    return cardData;
  }
  //endregion

  //region AI Logic
  generateAIDeck() {
    const availableIds = Object.keys(this.abilities).map(Number);
    const aiDeckRules = {
      minCost: 1,
      maxCost: 3,
      preferredTypes: ['ATTACK', 'DEFENSE'],
      deckSize: 5
    };

    let suitableAbilities = availableIds.filter(id => {
      const ability = this.abilities[id];
      return ability.cost >= aiDeckRules.minCost && 
             ability.cost <= aiDeckRules.maxCost &&
             aiDeckRules.preferredTypes.includes(ability.effectType);
    });

    if (suitableAbilities.length < aiDeckRules.deckSize) {
      const remainingIds = availableIds.filter(id => !suitableAbilities.includes(id));
      suitableAbilities.push(...remainingIds.slice(0, aiDeckRules.deckSize - suitableAbilities.length));
    }

    const selectedCards = [];
    while (selectedCards.length < aiDeckRules.deckSize && suitableAbilities.length > 0) {
      const randomIndex = Math.floor(Math.random() * suitableAbilities.length);
      selectedCards.push(suitableAbilities[randomIndex]);
      suitableAbilities.splice(randomIndex, 1);
    }

    while (selectedCards.length < aiDeckRules.deckSize) {
      selectedCards.push(availableIds[Math.floor(Math.random() * availableIds.length)]);
    }

    return selectedCards.slice(0, aiDeckRules.deckSize);
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
  //endregion

  //region Game Actions
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

  findWeakestEnemy() {
    return this.players.human.field
      .reduce((weakest, current) => 
        current.health < (weakest?.health || Infinity) ? current : weakest, null)?.id;
  }

  onTurnEnd() {
    if (this.players[this.turnSystem.currentTurn].type === 'ai') {
      this.processAITurn();
    }
  }
  //endregion
}

module.exports = { PveGame };