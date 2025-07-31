// Game logic utilities

// Function to get random card value (1-8)
function getRandomCard() {
  return Math.floor(Math.random() * 8) + 1;
}

// Function to get random card value (1: 60%, 5: 30%, 10: 10%)
function getRandomCardValue() {
  const rand = Math.random();
  if (rand < 0.6) return 1;
  if (rand < 0.9) return 5;
  return 10;
}

// Function to create a card object
function createCard(number, team) {
  return {
    number: number,
    value: getRandomCardValue(),
    team: team
  };
}

// Function to initialize game board
function initializeGameBoard() {
  return {
    yellowPlayerCard: createCard(getRandomCard(), 'yellow'),
    yellowSharedCards: [
      createCard(getRandomCard(), 'yellow'),
      createCard(getRandomCard(), 'yellow'),
      createCard(getRandomCard(), 'yellow')
    ],
    pinkSharedCards: [
      createCard(getRandomCard(), 'pink'),
      createCard(getRandomCard(), 'pink'),
      createCard(getRandomCard(), 'pink')
    ],
    pinkPlayerCard: createCard(getRandomCard(), 'pink')
  };
}

// Function to calculate team scores based on card values
function calculateTeamScores(board) {
  let yellowScore = 0;
  let pinkScore = 0;
  
  // Count yellow shared cards
  board.yellowSharedCards.forEach(card => {
    if (card.team === 'yellow') yellowScore += card.value;
    else if (card.team === 'pink') pinkScore += card.value;
  });
  
  // Count pink shared cards
  board.pinkSharedCards.forEach(card => {
    if (card.team === 'yellow') yellowScore += card.value;
    else if (card.team === 'pink') pinkScore += card.value;
  });
  
  return { yellowScore, pinkScore };
}

module.exports = {
  getRandomCard,
  getRandomCardValue,
  createCard,
  initializeGameBoard,
  calculateTeamScores
};
