import { DOMHelper } from './utils.js';

export class UIManager {
  constructor(elements) {
    this.elements = this.validateElements(elements);
  }

  validateElements(elements) {
    const requiredElements = [
      'mainMenu', 'cardSelectContainer', 'gameContainer',
      'playerHealth', 'aiHealth', 'playerDeck', 'aiDeck',
      'playerHand', 'endTurnBtn', 'errorMessage', 'aiHand'
    ];
    
    requiredElements.forEach(name => {
      if (!elements[name]) {
        throw new Error(`Critical UI element missing: ${name}`);
      }
    });
    return elements;
  }

  toggleInterface(screen) {
    const screens = {
      main: this.elements.mainMenu,
      cardSelect: this.elements.cardSelectContainer,
      game: this.elements.gameContainer
    };

    Object.values(screens).forEach(el => {
      el.classList.remove('active');
      el.hidden = true;
    });

    if (screens[screen]) {
      screens[screen].classList.add('active');
      screens[screen].hidden = false;
    }
  }

  updateCardSelection(selectedCount) {
    const isComplete = selectedCount === 5;
    this.elements.confirmButton.disabled = !isComplete;
    this.elements.confirmButton.querySelector('.btn-text').textContent = 
      `Подтвердить выбор (${selectedCount}/5)`;
  }

  renderCardSelection(cards, clickHandler) {
    this.elements.cardSelect.innerHTML = cards
      .map(card => DOMHelper.createCardElement(card, 'select'))
      .join('');

    this.elements.cardSelect.querySelectorAll('.card')
      .forEach(card => card.addEventListener('click', clickHandler));
  }

  updateGameInterface(state) {
    // Обновление статистики
    this.elements.playerHealth.textContent = state.human.health;
    this.elements.playerDeck.textContent = state.human.deck.length;
    
    // Отрисовка карт
    this.renderPlayerHand(state.human.hand);
    this.renderAIHand(state.ai.hand.length);
  }

  renderPlayerHand(hand) {
    this.elements.playerHand.innerHTML = hand
      .map(card => DOMHelper.createCardElement(card, 'player'))
      .join('');
  }

  renderAIHand(cardCount) {
    this.elements.aiHand.innerHTML = Array(cardCount)
      .fill()
      .map(() => DOMHelper.createCardElement(null, 'ai'))
      .join('');
  }

  showError(message, duration = 5000) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.add('visible');
    setTimeout(() => {
      this.elements.errorMessage.classList.remove('visible');
    }, duration);
  }
}