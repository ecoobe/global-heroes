// server/game/modes/pve-engine.js
const { BaseGame } = require('../core/base-game');
const { CombatSystem } = require('../core/combat-system');

class PveGame extends BaseGame {
  constructor(playerDeck, aiDeck) {
    super({ human: playerDeck, ai: aiDeck }, 'pve');
    this.combatSystem = new CombatSystem();
  }

  initializePlayers(decks) {
    this.players = {
      human: this.createPlayer(decks.human, 'human'),
      ai: this.createPlayer(decks.ai, 'ai')
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

  validateDeck(deck) {
    return deck.map(id => {
      const ability = abilities[id];
      return {
        id: Number(id),
        name: ability.name,
        cost: ability.cost || 1,
        charges: ability.charges || 1,
        strength: ability.strength || 0,
        health: ability.health || 1
      };
    });
  }

  onTurnEnd() {
    if (this.players[this.turnSystem.currentTurn].type === 'ai') {
      this.processAITurn();
    }
  }

  processAITurn() {
    // AI логика
    setTimeout(() => {
      const ai = this.players.ai;
      if (ai.hand.length > 0) {
        const playableCards = ai.hand.filter(c => c.cost <= ai.energy);
        if (playableCards.length > 0) {
          this.playCard('ai', playableCards[0].id);
        }
      }
      this.turnSystem.endTurn();
    }, 2000);
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