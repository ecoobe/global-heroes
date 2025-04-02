export class GameLogic {
	static async loadHeroes() {
	  try {
		const response = await fetch('/assets/heroes/heroes.json');
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	  } catch (error) {
		throw new Error(`Ошибка загрузки героев: ${error.message}`);
	  }
	}
  
	static validateDeck(selectedHeroes) {
	  return selectedHeroes.size === 5;
	}
}