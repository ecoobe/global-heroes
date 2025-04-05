import { DOMHelper } from './utils.js';

export class UIManager {
  constructor(elements) {
    this.elements = elements;
    this.validateElements();
    this.initDynamicElements();
    this.setInitialState();
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

  setInitialState() {
    this.elements.mainMenu.hidden = false;
    this.elements.heroSelectContainer.hidden = true;
    this.elements.gameContainer.hidden = true;
    
    this.elements.mainMenu.style.display = 'flex';
    this.elements.heroSelectContainer.style.display = 'none';
    this.elements.gameContainer.style.display = 'none';
  }

  toggleInterface(screen) {
	console.log('[UI] Switching to:', screen);
  
	// Сбрасываем все inline-стили
	this.elements.mainMenu.style.cssText = '';
	this.elements.heroSelectContainer.style.cssText = '';
	this.elements.gameContainer.style.cssText = '';
  
	// Скрываем все элементы
	this.elements.mainMenu.hidden = true;
	this.elements.heroSelectContainer.hidden = true;
	this.elements.gameContainer.hidden = true;
  
	// Активируем целевой интерфейс
	switch(screen) {
	  case 'main':
		this.elements.mainMenu.hidden = false;
		break;
	  
	  case 'heroSelect':
		this.elements.heroSelectContainer.hidden = false;
		break;
	  
	  case 'game':
		this.elements.gameContainer.hidden = false;
		break;
	}
  
	console.log('[UI] Verified state:', {
	  main: this.elements.mainMenu.hidden,
	  heroSelect: this.elements.heroSelectContainer.hidden,
	  game: this.elements.gameContainer.hidden
	});
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
    try {
      this.elements.heroSelect.innerHTML = heroes
        .map(hero => DOMHelper.createHeroCard(hero))
        .join('');

      this.elements.heroCards = Array.from(
        this.elements.heroSelect.querySelectorAll('.hero-card')
      );
      
      this.elements.heroCards.forEach(card => {
        card.addEventListener('click', clickHandler);
      });
    } catch (error) {
      console.error('Hero cards rendering error:', error);
      this.showError('Ошибка отображения героев');
    }
  }

  updateGameInterface(state) {
    if (!state) return;

    try {
      this.elements.playerHealth.textContent = state.human.health;
      this.elements.aiHealth.textContent = state.ai.health;
      this.elements.playerDeck.textContent = state.human.deck?.length || 0;
      this.elements.aiDeck.textContent = state.ai.deck?.length || 0;
      
      this.renderBattlefield(state.human.field, state.ai.field);
      this.renderPlayerHand(state.human.hand);
    } catch (error) {
      console.error('Game interface update error:', error);
      this.showError('Ошибка обновления интерфейса');
    }
  }

  renderPlayerHand(hand = []) {
    try {
      this.elements.playerHand.innerHTML = hand
        .map(card => DOMHelper.createCardElement(card))
        .join('');
    } catch (error) {
      console.error('Player hand rendering error:', error);
      this.elements.playerHand.innerHTML = '';
    }
  }

  renderBattlefield(playerField = [], aiField = []) {
    try {
      this.clearBattlefield();
      
      playerField.forEach(unit => {
        const element = DOMHelper.createUnitElement(unit, 'player');
        this.elements.playerBattlefield.appendChild(element);
      });
      
      aiField.forEach(unit => {
        const element = DOMHelper.createUnitElement(unit, 'ai');
        this.elements.aiBattlefield.appendChild(element);
      });
    } catch (error) {
      console.error('Battlefield rendering error:', error);
      this.clearBattlefield();
    }
  }

  clearBattlefield() {
    this.elements.playerBattlefield.innerHTML = '';
    this.elements.aiBattlefield.innerHTML = '';
  }

  showError(message, duration = 5000) {
    try {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.classList.add('visible');
      
      setTimeout(() => {
        this.elements.errorMessage.classList.remove('visible');
      }, duration);
    } catch (error) {
      console.error('Error displaying error message:', error);
    }
  }
}
