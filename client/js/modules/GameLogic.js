export class GameLogic {
	static HEROES_PATH = '/assets/heroes/heroes.json';
	static DECK_SIZE = 5;
	static MIN_STRENGTH = 1;
	static MAX_STRENGTH = 10;
	static MIN_HEALTH = 1;
	static MAX_HEALTH = 15;
  
	static async loadHeroes() {
	  try {
		const response = await fetch(this.HEROES_PATH);
		if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
		
		const heroes = await response.json();
		return this.validateAndNormalizeHeroes(heroes);
		
	  } catch (error) {
		console.error('Hero loading failed:', error);
		throw new Error('Не удалось загрузить героев');
	  }
	}
  
	static validateAndNormalizeHeroes(heroes) {
	  if (!Array.isArray(heroes)) {
		throw new Error('Invalid heroes data format');
	  }
  
	  return heroes.map(hero => ({
		id: this.validateNumber(hero.id, 1, 100),
		name: this.validateString(hero.name, 'Безымянный герой'),
		class: this.validateString(hero.class, 'Странник'),
		strength: this.validateNumber(hero.strength, this.MIN_STRENGTH, this.MAX_STRENGTH),
		health: this.validateNumber(hero.health, this.MIN_HEALTH, this.MAX_HEALTH),
		ability: this.parseAbility(hero.ability),
		image: this.validateImagePath(hero.image)
	  }));
	}
  
	static parseAbility(ability) {
	  return {
		name: this.validateString(ability?.name, 'Способность'),
		description: this.validateString(ability?.description, 'Описание отсутствует'),
		cost: this.validateNumber(ability?.cost, 0, 5),
		charges: this.validateNumber(ability?.charges, 1, 3)
	  };
	}
  
	static validateNumber(value, min, max) {
	  const num = Number(value) || min;
	  return Math.min(Math.max(num, min), max);
	}
  
	static validateString(value, defaultValue) {
	  return typeof value === 'string' && value.trim() ? value : defaultValue;
	}
  
	static validateImagePath(path) {
	  const validExtensions = ['.png', '.jpg', '.webp'];
	  return validExtensions.some(ext => path?.endsWith(ext)) 
		? `/images/heroes/${path}`
		: '/images/default-hero.png';
	}
  
	static validateDeck(selectedHeroes) {
	  if (!(selectedHeroes instanceof Set)) {
		throw new Error('Invalid deck format');
	  }
	  return selectedHeroes.size === this.DECK_SIZE;
	}
  
	static calculateDeckStats(deck, heroesData) {
	  return deck.reduce((stats, heroId) => {
		const hero = heroesData.find(h => h.id === heroId);
		if (!hero) return stats;
		
		return {
		  power: stats.power + hero.strength,
		  health: stats.health + hero.health,
		  abilities: [...stats.abilities, hero.ability]
		};
	  }, { power: 0, health: 0, abilities: [] });
	}
  
	static getAbilityDetails(abilityName, abilitiesConfig) {
	  return abilitiesConfig.find(a => a.name === abilityName) || null;
	}
}