export class UIManager {
	constructor(elements) {
	  this.elements = elements;
	  this.validateElements();
	}
  
	validateElements() {
	  const requiredElements = [
		'mainMenu', 'heroSelectContainer', 'gameContainer',
		'playerHealth', 'aiHealth', 'playerDeck', 'aiDeck',
		'playerHand', 'endTurnBtn', 'errorMessage'
	  ];
	  
	  requiredElements.forEach(name => {
		if (!this.elements[name]) {
		  throw new Error(`Critical UI element missing: ${name}`);
		}
	  });
	}
  
	toggleInterface(screen) {
	  const uiMap = {
		main: this.elements.mainMenu,
		heroSelect: this.elements.heroSelectContainer,
		game: this.elements.gameContainer
	  };
  
	  Object.values(uiMap).forEach(element => 
		element.classList.remove('active')
	  );
  
	  if (uiMap[screen]) {
		uiMap[screen].classList.add('active');
	  }
	}
  
	updateHeroSelection(selectedCount) {
	  this.elements.confirmButton.disabled = selectedCount !== 5;
	  this.elements.confirmButton.querySelector('.btn-text').textContent = 
		`Подтвердить выбор (${selectedCount}/5)`;
	}
  
	renderHeroCards(heroes, clickHandler) {
	  this.elements.heroSelect.innerHTML = heroes
		.map(hero => DOMHelper.createHeroCard(hero))
		.join('');
  
	  this.elements.heroSelect.querySelectorAll('.hero-card')
		.forEach(card => card.addEventListener('click', clickHandler));
	}
  
	clearHand() {
	  this.elements.playerHand.innerHTML = '';
	}
  
	clearBattlefield() {
	  this.elements.playerBattlefield.innerHTML = '';
	  this.elements.aiBattlefield.innerHTML = '';
	}
  
	updateStatus(text, isOnline) {
	  this.elements.status.textContent = text;
	  this.elements.status.classList.toggle('online', isOnline);
	  this.elements.status.classList.toggle('offline', !isOnline);
	}
}