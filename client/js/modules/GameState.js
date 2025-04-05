export class GameState {
	constructor() {
	  this.selectedHeroes = new Set();
	  this.heroes = [];
	  this.turnTimer = null;
	  
	  // Инициализация с дефолтным состоянием
	  this.currentGameState = {
		id: null,
		human: this.createDefaultPlayerState(),
		ai: this.createDefaultPlayerState(),
		currentTurn: 'human'
	  };
	}
  
	// Метод для создания состояния игрока
	createDefaultPlayerState() {
	  return {
		health: 30,
		deck: [],
		hand: [],
		field: [],
		energy: 0,
		energyPerTurn: 1
	  };
	}
  
	reset() {
	  this.selectedHeroes.clear();
	  this.clearTimer();
	  
	  // Сброс к дефолтному состоянию
	  this.currentGameState = {
		id: null,
		human: this.createDefaultPlayerState(),
		ai: this.createDefaultPlayerState(),
		currentTurn: 'human'
	  };
	}
  
	clearTimer() {
	  if (this.turnTimer) {
		clearInterval(this.turnTimer);
		this.turnTimer = null;
	  }
	}
  
	// Геттер для безопасного доступа
	get safeGameState() {
	  return this.currentGameState || {
		id: 'invalid',
		human: this.createDefaultPlayerState(),
		ai: this.createDefaultPlayerState(),
		currentTurn: 'none'
	  };
	}
}