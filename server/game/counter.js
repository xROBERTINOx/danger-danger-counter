// Game logic module for the Counter game
const { getRandomCard, createCard } = require('../utils/gameLogic');

// Get the player data for this socket
function getPlayerData(gameRoom, socket) {
  const player = gameRoom.players.get(socket.id);
  if (!player) return null;
  
  // Return player-specific data
  return {
    username: player.username,
    team: player.team,
    isReady: player.isReady,
    playerCard: player.team === 'yellow' ? gameRoom.board.yellowPlayerCard : gameRoom.board.pinkPlayerCard
  };
}

// Get the game state for all clients
function getGameState(gameRoom) {
  return {
    gameId: gameRoom.id,
    gameName: gameRoom.name,
    players: Array.from(gameRoom.players.values()),
    gameState: gameRoom.gameState,
    board: gameRoom.board,
    yellowRoundsWon: gameRoom.yellowRoundsWon,
    pinkRoundsWon: gameRoom.pinkRoundsWon,
    yellowCurrentPoints: gameRoom.yellowCurrentPoints,
    pinkCurrentPoints: gameRoom.pinkCurrentPoints,
    yellowTeamOut: gameRoom.yellowTeamOut,
    pinkTeamOut: gameRoom.pinkTeamOut,
    roundTimeLeft: gameRoom.roundTimeLeft,
    currentRound: gameRoom.currentRound,
    lastRoundWinner: gameRoom.lastRoundWinner,
    lastRoundYellowPoints: gameRoom.lastRoundYellowPoints,
    lastRoundPinkPoints: gameRoom.lastRoundPinkPoints,
    logs: gameRoom.logs
  };
}

// Check if teams are balanced
function checkTeamBalance(gameRoom) {
  let yellowCount = 0;
  let pinkCount = 0;
  
  gameRoom.players.forEach(player => {
    if (player.team === 'yellow') yellowCount++;
    if (player.team === 'pink') pinkCount++;
  });
  
  return {
    balanced: Math.abs(yellowCount - pinkCount) <= 1,
    yellowCount,
    pinkCount
  };
}

// Check if all players are ready
function allPlayersReady(gameRoom) {
  let allReady = true;
  gameRoom.players.forEach(player => {
    if (!player.isReady) allReady = false;
  });
  return allReady;
}

// Handle card swapping with new pile support
function swapCards(gameRoom, from, to) {
  // Parse positions to determine source and target locations
  let sourceCard = null;
  let targetCard = null;
  
  // For debugging
  console.log(`Swap request from: ${from} to: ${to}`);
  
  // Handle source position (from)
  if (from === 'yellow-player') {
    sourceCard = gameRoom.board.yellowPlayerCard;
  } else if (from === 'pink-player') {
    sourceCard = gameRoom.board.pinkPlayerCard;
  } else if (from.startsWith('yellow-shared-')) {
    const index = parseInt(from.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.yellowSharedCards.length) {
      sourceCard = gameRoom.board.yellowSharedCards[index];
    }
  } else if (from.startsWith('pink-shared-')) {
    const index = parseInt(from.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.pinkSharedCards.length) {
      sourceCard = gameRoom.board.pinkSharedCards[index];
    }
  } else if (from.startsWith('yellow-new-pile-')) {
    const index = parseInt(from.split('-')[3]);
    if (gameRoom.board.yellowNewPiles && index >= 0 && index < gameRoom.board.yellowNewPiles.length) {
      sourceCard = gameRoom.board.yellowNewPiles[index];
    }
  } else if (from.startsWith('pink-new-pile-')) {
    const index = parseInt(from.split('-')[3]);
    if (gameRoom.board.pinkNewPiles && index >= 0 && index < gameRoom.board.pinkNewPiles.length) {
      sourceCard = gameRoom.board.pinkNewPiles[index];
    }
  } else {
    return false; // Invalid source position
  }
  
  // Make sure source card exists
  if (!sourceCard) {
    console.log("Source card doesn't exist");
    return false;
  }
  
  // Check if trying to place in new pile locations
  if (to.startsWith('yellow-new-pile-') || to.startsWith('pink-new-pile-')) {
    const team = to.startsWith('yellow') ? 'yellow' : 'pink';
    const index = parseInt(to.split('-')[3]);
    const piles = team === 'yellow' ? gameRoom.board.yellowNewPiles : gameRoom.board.pinkNewPiles;
    
    console.log(`Attempting to place in new pile: ${team} at index ${index}`);
    console.log(`Source card:`, sourceCard);
    console.log(`Current pile state:`, piles);
    
    // Can only place in an empty slot, and card must have newPile feature
    if (piles && index >= 0 && index < piles.length && piles[index] === null) {
      console.log(`Placing card in new pile, card has newPile feature: ${sourceCard.newPile}`);
      
      // Remove card from source and replace with new card
      if (from === 'yellow-player') {
        gameRoom.board.yellowPlayerCard = createCard(getRandomCard(), 'yellow');
      } else if (from === 'pink-player') {
        gameRoom.board.pinkPlayerCard = createCard(getRandomCard(), 'pink');
      } else if (from.startsWith('yellow-shared-')) {
        const index = parseInt(from.split('-')[2]);
        if (index >= 0 && index < gameRoom.board.yellowSharedCards.length) {
          gameRoom.board.yellowSharedCards[index] = createCard(getRandomCard(), 'yellow');
        }
      } else if (from.startsWith('pink-shared-')) {
        const index = parseInt(from.split('-')[2]);
        if (index >= 0 && index < gameRoom.board.pinkSharedCards.length) {
          gameRoom.board.pinkSharedCards[index] = createCard(getRandomCard(), 'pink');
        }
      } else if (from.startsWith('yellow-new-pile-')) {
        const idx = parseInt(from.split('-')[3]);
        if (gameRoom.board.yellowNewPiles && idx >= 0 && idx < gameRoom.board.yellowNewPiles.length) {
          gameRoom.board.yellowNewPiles[idx] = null;
        }
      } else if (from.startsWith('pink-new-pile-')) {
        const idx = parseInt(from.split('-')[3]);
        if (gameRoom.board.pinkNewPiles && idx >= 0 && idx < gameRoom.board.pinkNewPiles.length) {
          gameRoom.board.pinkNewPiles[idx] = null;
        }
      }
      
      // Place card in new pile
      piles[index] = sourceCard;
      return true;
    }
    console.log("Can't place in new pile - either slot is occupied or card doesn't have newPile feature");
    return false;
  }
  
  // Handle regular swaps (non-new-pile targets)
  if (to === 'yellow-player') {
    targetCard = gameRoom.board.yellowPlayerCard;
    gameRoom.board.yellowPlayerCard = sourceCard;
  } else if (to === 'pink-player') {
    targetCard = gameRoom.board.pinkPlayerCard;
    gameRoom.board.pinkPlayerCard = sourceCard;
  } else if (to.startsWith('yellow-shared-')) {
    const index = parseInt(to.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.yellowSharedCards.length) {
      targetCard = gameRoom.board.yellowSharedCards[index];
      gameRoom.board.yellowSharedCards[index] = sourceCard;
    } else {
      return false; // Invalid index
    }
  } else if (to.startsWith('pink-shared-')) {
    const index = parseInt(to.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.pinkSharedCards.length) {
      targetCard = gameRoom.board.pinkSharedCards[index];
      gameRoom.board.pinkSharedCards[index] = sourceCard;
    } else {
      return false; // Invalid index
    }
  } else {
    return false; // Invalid target position
  }
  
  // Update source position with target card
  if (from === 'yellow-player') {
    gameRoom.board.yellowPlayerCard = targetCard;
  } else if (from === 'pink-player') {
    gameRoom.board.pinkPlayerCard = targetCard;
  } else if (from.startsWith('yellow-shared-')) {
    const index = parseInt(from.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.yellowSharedCards.length) {
      gameRoom.board.yellowSharedCards[index] = targetCard;
    }
  } else if (from.startsWith('pink-shared-')) {
    const index = parseInt(from.split('-')[2]);
    if (index >= 0 && index < gameRoom.board.pinkSharedCards.length) {
      gameRoom.board.pinkSharedCards[index] = targetCard;
    }
  } else if (from.startsWith('yellow-new-pile-')) {
    const index = parseInt(from.split('-')[3]);
    if (gameRoom.board.yellowNewPiles && index >= 0 && index < gameRoom.board.yellowNewPiles.length) {
      gameRoom.board.yellowNewPiles[index] = targetCard;
    }
  } else if (from.startsWith('pink-new-pile-')) {
    const index = parseInt(from.split('-')[3]);
    if (gameRoom.board.pinkNewPiles && index >= 0 && index < gameRoom.board.pinkNewPiles.length) {
      gameRoom.board.pinkNewPiles[index] = targetCard;
    }
  }
  
  return true;
}

// Export the module functions
module.exports = {
  getPlayerData,
  getGameState,
  checkTeamBalance,
  allPlayersReady,
  swapCards
};
