const { abilities } = require('../heroes/abilities');

class PveGame {
    constructor(playerDeck) {
        this.players = {
            human: this.initPlayer(playerDeck),
            ai: this.initAI()
        };
        this.turn = 'human';
    }

    initPlayer(deck) {
        return {
            deck: deck.map(id => ({ ...abilities[id], health: abilities[id].health })),
            field: [],
            health: 30
        };
    }

    initAI() {
        const aiDeck = Object.keys(abilities)
            .slice(0, 5)
            .map(id => ({ 
                ...abilities[id], 
                strength: Math.floor(abilities[id].strength * 0.8)
            }));
        
        return {
            deck: aiDeck,
            field: [],
            health: 30
        };
    }

    async saveToRedis(redisClient) {
        await redisClient.hSet('games', this.id, JSON.stringify(this));
    }

    getPublicState() {
        return {
            players: {
                human: this.players.human,
                ai: { health: this.players.ai.health, field: this.players.ai.field }
            }
        };
    }
}

module.exports = { PveGame };