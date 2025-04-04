import { DOMHelper } from './utils.js';

export class UIManager {
  constructor(elements) {
    this.elements = elements;
    this.validateElements();
    this.initDynamicElements();
  }

  validateElements() {
    const requiredElements = [
      'mainMenu', 'heroSelectContainer', 'gameContainer',
      'playerHealth', 'aiHealth', 'playerDeck', 'aiDeck',
      'playerHand', 'endTurnBtn', 'errorMessage',
      'playerBattlefield', 'aiBattlefield'
    ];
    
    requiredElements.forEach(name => {
      if (!this.elements[name]) {
        throw new Error(`Critical UI element missing: ${name}`);
      }
    });
  }

  initDynamicElements() {
    this.elements.heroCards = [];
    this.activeInterface = 'main';
  }

  toggleInterface(screen) {
	console.log('[UI] Transition to:', screen);
	
	const interfaces = {
	  main: this.elements.mainMenu,
	  heroSelect: this.elements.heroSelectContainer,
	  game: this.elements.gameContainer
	};
  
	// Сброс всех состояний
	Object.values(interfaces).forEach(el => {
	  el.classList.remove('active', 'ui-force-visible');
	  el.style.cssText = '';
	});
  
	// Активация целевого интерфейса
	if (interfaces[screen]) {
	  const target = interfaces[screen];
	  target.classList.add('active', 'ui-force-visible');
	  target.style.display = 'block';
	  target.style.opacity = '1';
	  target.hidden = false;
  
	  // Гарантия визуального отображения
	  requestAnimationFrame(() => {
		target.style.transform = 'none';
		target.style.visibility = 'visible';
	  });
	}
  
	// Специфичные действия
	switch(screen) {
	  case 'game':
		this.elements.gameContainer.scrollIntoView({ behavior: 'instant' });
		break;
	}
  }

  updateHeroSelection(selectedCount) {
    const isComplete = selectedCount === 5;
    this.elements.confirmButton.disabled = !isComplete;
    
    const counter = this.elements.confirmButton.querySelector('.btn-text');
    if (counter) {
      counter.textContent = `Подтвердить выбор (${selectedCount}/5)`;
      counter.classList.toggle('complete', isComplete);
    }
  }

  renderHeroCards(heroes, clickHandler) {
    this.elements.heroSelect.innerHTML = heroes
      .map(hero => DOMHelper.createHeroCard(hero))
      .join('');

    this.elements.heroCards = Array.from(
      this.elements.heroSelect.querySelectorAll('.hero-card')
    );
    
    this.elements.heroCards.forEach(card => {
      card.addEventListener('click', clickHandler);
      card.addEventListener('mouseenter', this.handleCardHover);
    });
  }

  handleCardHover(event) {
    const heroId = event.currentTarget.dataset.id;
    // Логика показа подсказки
  }

  updateGameInterface(state) {
    this.elements.playerHealth.textContent = state.human.health;
    this.elements.aiHealth.textContent = state.ai.health;
    this.elements.playerDeck.textContent = state.human.deck.length;
    this.elements.aiDeck.textContent = state.ai.deck.length;
    
    this.renderBattlefield(state.human.field, state.ai.field);
    this.renderPlayerHand(state.human.hand);
  }

  renderPlayerHand(hand) {
    this.elements.playerHand.innerHTML = hand
      .map(card => DOMHelper.createCardElement(card))
      .join('');
  }

  renderBattlefield(playerField, aiField) {
	this.clearBattlefield();
  
	playerField.forEach(unit => {
	  const element = DOMHelper.createUnitElement(unit, 'player');
	  this.elements.playerBattlefield.appendChild(element);
	});
  
	aiField.forEach(unit => {
	  const element = DOMHelper.createUnitElement(unit, 'ai');
	  this.elements.aiBattlefield.appendChild(element);
	});
  }

  clearBattlefield() {
    this.elements.playerBattlefield.innerHTML = '';
    this.elements.aiBattlefield.innerHTML = '';
  }

  showError(message, duration = 5000) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.add('visible');
    
    setTimeout(() => {
      this.elements.errorMessage.classList.remove('visible');
    }, duration);
  }
}