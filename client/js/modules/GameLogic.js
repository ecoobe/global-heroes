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
		console.log('Raw heroes data:', heroes);
		
		const validated = this.validateAndNormalizeHeroes(heroes);
		if (validated.length === 0) {
		  throw new Error('No valid heroes found');
		}
		
		console.log('Validated heroes:', validated);
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
		id: this.validateNumber(ability.id, 1, 100, 99),
		image: this.validateImagePath(ability.image)
	  };
	}
  
	static getDefaultAbility() {
	  return {
		name: 'Базовая атака',
		description: 'Стандартная атака',
		cost: 1,
		charges: 1,
		id: 0,
		image: '/images/heroes/default-hero.png'
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
		const validExtensions = ['.webp', '.png', '.jpg'];
	  
		try {
		  if (!path || typeof path !== 'string') return '/assets/heroes/images/default-hero.webp';
	  
		  const cleanPath = path.replace(/\.\./g, '').trim(); 
	  
		  return validExtensions.some(ext => cleanPath.endsWith(ext)) 
			? cleanPath  // Оставляем путь как есть, если расширение верное
			: '/assets/heroes/images/default-hero.webp';
		} catch {
		  return '/assets/heroes/images/default-hero.webp';
		}
	}
  
	static validateDeck(selectedHeroIds, availableHeroes) {
	  console.log('[VALIDATION] Input data:', {
		selectedHeroIds: JSON.stringify(selectedHeroIds),
		availableHeroes: JSON.stringify(availableHeroes?.map(h => h.id))
	  });
	
	  // 1. Проверка типа данных
	  if (!Array.isArray(selectedHeroIds)) {
		console.error('[VALIDATION ERROR] Invalid input type:', typeof selectedHeroIds);
		return {
		  isValid: false,
		  errors: ['Некорректный формат данных колоды'],
		  deck: []
		};
	  }
	
	  const errors = [];
	  const availableIds = availableHeroes?.map(h => h.id) || [];
	
	  // 2. Проверка существования героев
	  const invalidIds = selectedHeroIds.filter(id => !availableIds.includes(id));
	  console.log('[VALIDATION STEP] Invalid IDs check:', invalidIds);
	  
	  if (invalidIds.length > 0) {
		errors.push(`Несуществующие ID: ${invalidIds.join(', ')}`);
	  }
	
	  // 3. Проверка уникальности
	  const uniqueIds = [...new Set(selectedHeroIds)];
	  console.log('[VALIDATION STEP] Unique IDs:', uniqueIds);
	  
	  if (uniqueIds.length !== selectedHeroIds.length) {
		errors.push('Обнаружены дубликаты ID');
	  }
	
	  // 4. Проверка размера колоды
	  console.log('[VALIDATION STEP] Deck size:', selectedHeroIds.length);
	  
	  if (selectedHeroIds.length !== this.DECK_SIZE) {
		errors.push(`Требуется ${this.DECK_SIZE} героев (выбрано ${selectedHeroIds.length})`);
	  }
	
	  console.log('[VALIDATION RESULT]', {
		isValid: errors.length === 0,
		errors
	  });
	
	  return {
		isValid: errors.length === 0,
		errors,
		deck: selectedHeroIds
	  };
	}
}