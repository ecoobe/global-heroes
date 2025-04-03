export class GameLogic {
	static HEROES_PATH = '/assets/heroes/heroes.json';
	static DECK_SIZE = 5;
  
	static async loadHeroes() {
	  try {
		const timestamp = Date.now();
		const response = await fetch(`${this.HEROES_PATH}?t=${timestamp}`);
		
		if (!response.ok) {
		  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
  
		const heroes = await response.json();
		
		if (!Array.isArray(heroes)) {
		  throw new Error('Invalid heroes data format');
		}
  
		return heroes.map(hero => ({
		  id: Number(hero.id),
		  name: hero.name || 'Unknown Hero',
		  image: hero.image || '/images/default-hero.png',
		  strength: Number(hero.strength) || 0,
		  health: Number(hero.health) || 1,
		  ability: hero.ability || {}
		}));
  
	  } catch (error) {
		console.error('GameLogic.loadHeroes failed:', error);
		throw new Error(`Failed to load heroes: ${error.message}`);
	  }
	}
  
	static validateDeck(selectedHeroes) {
	  return selectedHeroes.size === this.DECK_SIZE;
	}
  
	static getAbility(id) {
	  return abilities[id] || null;
	}
  
	static calculateDeckPower(deck) {
	  return deck.reduce((sum, heroId) => {
		const hero = this.getAbility(heroId);
		return sum + (hero?.strength || 0);
	  }, 0);
	}
}