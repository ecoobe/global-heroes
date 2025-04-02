export class GameState {
	constructor() {
	  this.selectedHeroes = new Set();
	  this.heroes = [];
	  this.currentGameState = null;
	  this.turnTimer = null;
	}
  
	reset() {
	  this.selectedHeroes.clear();
	  this.currentGameState = null;
	  this.clearTimer();
	}
  
	clearTimer() {
	  if (this.turnTimer) {
		clearInterval(this.turnTimer);
		this.turnTimer = null;
	  }
	}
}