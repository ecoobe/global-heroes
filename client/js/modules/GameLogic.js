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
		const validated = this.validateAndNormalizeHeroes(heroes);
		
		if (validated.length === 0) {
		  throw new Error('No valid heroes found');
		}
		
		return validated;
  
	  } catch (error) {
		console.error('Hero loading failed:', error);
		throw new Error('Не удалось загрузить героев');
	  }
	}
  
	static validateAndNormalizeHeroes(heroes) {
	  if (!Array.isArray(heroes)) {
		throw new Error('Invalid heroes data format');
	  }
  
	  const seenIds = new Set();
	  return heroes.reduce((acc, hero) => {
		try {
		  const normalized = {
			id: this.validateNumber(hero.id, 1, 100),
			name: this.validateString(hero.name, 'Безымянный герой'),
			class: this.validateString(hero.class, 'Странник'),
			strength: this.validateNumber(hero.strength, this.MIN_STRENGTH, this.MAX_STRENGTH),
			health: this.validateNumber(hero.health, this.MIN_HEALTH, this.MAX_HEALTH),
			ability: this.parseAbility(hero.ability),
			image: this.validateImagePath(hero.image)
		  };
  
		  if (seenIds.has(normalized.id)) {
			console.warn(`Duplicate hero ID: ${normalized.id}`);
			return acc;
		  }
  
		  seenIds.add(normalized.id);
		  acc.push(normalized);
		  return acc;
  
		} catch (error) {
		  console.warn('Invalid hero skipped:', error.message);
		  return acc;
		}
	  }, []);
	}
  
	static parseAbility(ability) {
	  return {
		name: this.validateString(ability?.name, 'Способность'),
		description: this.validateString(ability?.description, 'Описание отсутствует'),
		cost: this.validateNumber(ability?.cost, 0, 5),
		charges: this.validateNumber(ability?.charges, 1, 3),
		id: this.validateNumber(ability?.id, 1, 100)
	  };
	}
  
	static validateNumber(value, min, max) {
	  const num = Number(value);
	  if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
	  return Math.min(Math.max(num, min), max);
	}
  
	static validateString(value, defaultValue) {
	  return typeof value === 'string' && value.trim() ? value.trim() : defaultValue;
	}
  
	static validateImagePath(path) {
	  const validExtensions = ['.png', '.jpg', '.webp'];
	  if (!path || typeof path !== 'string') return '/images/default-hero.png';
	  
	  const cleanPath = path.replace(/\.\./g, '').replace(/^\/+/g, '');
	  return validExtensions.some(ext => cleanPath.endsWith(ext)) 
		? `/images/heroes/${cleanPath}`
		: '/images/default-hero.png';
	}
  
	static validateDeck(selectedHeroes, availableHeroes) {
	  if (!(selectedHeroes instanceof Set)) {
		throw new Error('Invalid deck format');
	  }
  
	  const errors = [];
	  const deckArray = Array.from(selectedHeroes);
  
	  // Проверка размера колоды
	  if (deckArray.length !== this.DECK_SIZE) {
		errors.push(`Неправильный размер колоды: ${deckArray.length}/${this.DECK_SIZE}`);
	  }
  
	  // Проверка уникальности героев
	  const uniqueIds = new Set(deckArray);
	  if (uniqueIds.size !== this.DECK_SIZE) {
		errors.push('Дублирующиеся герои в колоде');
	  }
  
	  // Проверка валидности ID
	  const invalidIds = deckArray.filter(id => 
		!availableHeroes.some(h => h.id === id)
	  );
	  
	  if (invalidIds.length > 0) {
		errors.push(`Недействительные ID героев: ${invalidIds.join(', ')}`);
	  }
  
	  return {
		isValid: errors.length === 0,
		errors,
		deck: deckArray
	  };
	}
  
	static calculateDeckStats(deck, heroesData) {
	  return deck.reduce((stats, heroId) => {
		const hero = heroesData.find(h => h.id === heroId);
		if (!hero) {
		  console.warn(`Hero ${heroId} not found in deck calculation`);
		  return stats;
		}
		
		return {
		  power: stats.power + hero.strength,
		  health: stats.health + hero.health,
		  abilities: [...stats.abilities, hero.ability],
		  totalCost: stats.totalCost + (hero.ability?.cost || 0)
		};
	  }, { 
		power: 0, 
		health: 0, 
		abilities: [], 
		totalCost: 0 
	  });
	}
}