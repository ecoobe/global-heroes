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
		console.log('Raw heroes data:', heroes); // Для отладки
		
		const validated = this.validateAndNormalizeHeroes(heroes);
		if (validated.length === 0) {
		  throw new Error('No valid heroes found');
		}
		
		console.log('Validated heroes:', validated); // Для отладки
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
	  return heroes.reduce((acc, hero, index) => {
		try {
		  // Генерация ID если отсутствует
		  const baseId = hero.id || index + 1;
		  
		  const normalized = {
			id: this.validateNumber(baseId, 1, 100),
			name: this.validateString(hero.name, `Герой ${baseId}`),
			class: this.validateString(hero.class, 'Странник'),
			strength: this.validateNumber(hero.strength, this.MIN_STRENGTH, this.MAX_STRENGTH),
			health: this.validateNumber(hero.health, this.MIN_HEALTH, this.MAX_HEALTH),
			ability: this.parseAbility(hero.ability),
			image: this.validateImagePath(hero.image)
		  };
  
		  // Проверка уникальности ID
		  if (seenIds.has(normalized.id)) {
			console.warn(`Duplicate hero ID: ${normalized.id}`);
			return acc;
		  }
  
		  seenIds.add(normalized.id);
		  acc.push(normalized);
		  return acc;
  
		} catch (error) {
		  console.warn(`Invalid hero at index ${index}:`, error.message);
		  console.log('Problematic hero data:', hero);
		  return acc;
		}
	  }, []);
	}
  
	static parseAbility(ability) {
	  if (!ability) {
		console.warn('Missing ability, using default');
		return this.getDefaultAbility();
	  }
  
	  return {
		name: this.validateString(ability.name, 'Способность'),
		description: this.validateString(ability.description, 'Описание отсутствует'),
		cost: this.validateNumber(ability.cost, 0, 5, 1),
		charges: this.validateNumber(ability.charges, 1, 3, 1),
		id: this.validateNumber(ability.id, 1, 100, 99)
	  };
	}
  
	static getDefaultAbility() {
	  return {
		name: 'Базовая атака',
		description: 'Стандартная атака',
		cost: 1,
		charges: 1,
		id: 0
	  };
	}
  
	static validateNumber(value, min, max, defaultValue = min) {
	  const num = Number(value ?? defaultValue);
	  if (isNaN(num)) return defaultValue;
	  return Math.min(Math.max(num, min), max);
	}
  
	static validateString(value, defaultValue) {
	  return typeof value === 'string' && value.trim() ? value.trim() : defaultValue;
	}
  
	static validateImagePath(path) {
	  const validExtensions = ['.png', '.jpg', '.webp'];
	  
	  try {
		if (!path || typeof path !== 'string') return '/images/default-hero.png';
		
		const cleanPath = path
		  .replace(/\.\./g, '') // Защита от path traversal
		  .replace(/^\/+/, '') // Удаляем ведущие слеши
		  .trim();
  
		return validExtensions.some(ext => cleanPath.endsWith(ext)) 
		  ? `/images/heroes/${cleanPath}`
		  : '/images/default-hero.png';
	  } catch {
		return '/images/default-hero.png';
	  }
	}
  
	static validateDeck(selectedHeroes, availableHeroes) {
		const deckArray = Array.from(selectedHeroes);
		const errors = [];
	  
		if (deckArray.length !== this.DECK_SIZE) {
		  errors.push(`Нужно выбрать ровно ${this.DECK_SIZE} героев`);
		}
	  
		const uniqueIds = new Set(deckArray);
		if (uniqueIds.size !== this.DECK_SIZE) {
		  errors.push('В колоде есть повторяющиеся герои');
		}
	  
		const invalidIds = deckArray.filter(id => 
		  !availableHeroes.some(h => h.id === id)
		);
	  
		if (invalidIds.length > 0) {
		  errors.push(`Недействительные ID: ${invalidIds.join(', ')}`);
		}
	  
		return {
		  isValid: errors.length === 0,
		  errors,
		  deck: deckArray
		};
	}
}