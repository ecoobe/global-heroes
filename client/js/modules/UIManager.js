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
      'playerBattlefield', 'aiBattlefield', 'aiHand'
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
    
    [this.elements.mainMenu, this.elements.heroSelectContainer, this.elements.gameContainer]
      .forEach(el => {
        el.classList.remove('active');
        el.hidden = true;
      });

    const target = {
      main: this.elements.mainMenu,
      heroSelect: this.elements.heroSelectContainer,
      game: this.elements.gameContainer
    }[screen];

    if (target) {
      target.classList.add('active');
      target.hidden = false;
      
      if (screen === 'game') {
        target.style.display = 'grid';
        target.scrollIntoView({ behavior: 'smooth' });
      }
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
    });
  }

  updateGameInterface(state) {
    this.elements.playerHealth.textContent = state.human.health;
    this.elements.aiHealth.textContent = state.ai.health;
    this.elements.playerDeck.textContent = state.human.deck.length;
    this.elements.aiDeck.textContent = state.ai.deck.length;
    
    this.renderBattlefield(state.human.field, state.ai.field);
    this.renderPlayerHand(state.human.hand);
    this.renderAIHand(state.ai.hand);
  }

  renderPlayerHand(hand) {
    this.elements.playerHand.innerHTML = hand
      .map(card => DOMHelper.createCardElement(card, 'player'))
      .join('');
  }

  renderAIHand(hand) {
    this.elements.aiHand.innerHTML = hand
      .map(() => DOMHelper.createCardElement(null, 'ai'))
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