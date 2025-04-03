// server/game/core/turn-system.js
class TurnSystem {
	constructor(game) {
	  this.game = game;
	  this.currentTurn = 'player1';
	  this.round = 1;
	  this.timer = null;
	}
  
	startTurn() {
	  const player = this.game.players[this.currentTurn];
	  player.energy += player.energyPerTurn;
	  this.startTimer();
	}
  
	startTimer(duration = 30000) {
	  this.timer = setTimeout(() => this.endTurn(), duration);
	}
  
	endTurn() {
	  clearTimeout(this.timer);
	  this.currentTurn = this.getNextPlayer();
	  this.round++;
	  this.game.onTurnEnd();
	}
  
	getNextPlayer() {
	  const players = Object.keys(this.game.players);
	  const currentIndex = players.indexOf(this.currentTurn);
	  return players[(currentIndex + 1) % players.length];
	}
}
  
module.exports = { TurnSystem };