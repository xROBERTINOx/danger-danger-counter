// Round manager for handling game rounds
const { calculateTeamScores, initializeGameBoard } = require('./gameLogic');

// Start a new round
function startNewRound(io, gameRoom) {
  // Reset game board
  gameRoom.board = initializeGameBoard();
  gameRoom.yellowCurrentPoints = 0;
  gameRoom.pinkCurrentPoints = 0;
  gameRoom.yellowTeamOut = false;
  gameRoom.pinkTeamOut = false;
  gameRoom.gameState = 'playing';
  gameRoom.currentRound++;
  
  // Reset player readiness for next round
  gameRoom.players.forEach((player) => {
    player.isReady = false;
  });
  
  // Start round timer (60 seconds)
  gameRoom.roundTimeLeft = 60;
  startRoundTimer(io, gameRoom);
  
  // Log round start
  addGameLog(gameRoom, `Round ${gameRoom.currentRound} started!`);
  
  // Notify all players
  io.to(gameRoom.id).emit('round-started', {
    round: gameRoom.currentRound,
    board: gameRoom.board,
    timeLeft: gameRoom.roundTimeLeft
  });
}

// Start the round timer
function startRoundTimer(io, gameRoom) {
  // Clear existing timer if any
  if (gameRoom.roundTimer) {
    clearInterval(gameRoom.roundTimer);
  }
  
  gameRoom.roundTimer = setInterval(() => {
    gameRoom.roundTimeLeft--;
    
    // Broadcast time remaining
    io.to(gameRoom.id).emit('time-update', {
      timeLeft: gameRoom.roundTimeLeft
    });
    
    // Check if time is up
    if (gameRoom.roundTimeLeft <= 0) {
      endRound(io, gameRoom);
    }
  }, 1000);
}

// End the current round
function endRound(io, gameRoom) {
  // Clear timer
  if (gameRoom.roundTimer) {
    clearInterval(gameRoom.roundTimer);
    gameRoom.roundTimer = null;
  }
  
  // Calculate scores
  const { yellowScore, pinkScore } = calculateTeamScores(gameRoom.board);
  gameRoom.yellowCurrentPoints = yellowScore;
  gameRoom.pinkCurrentPoints = pinkScore;
  
  // Update total points
  gameRoom.yellowTotalPoints += yellowScore;
  gameRoom.pinkTotalPoints += pinkScore;
  
  // Determine winner of this round
  let roundWinner = null;
  if (yellowScore > pinkScore) {
    roundWinner = 'yellow';
    gameRoom.yellowRoundsWon++;
  } else if (pinkScore > yellowScore) {
    roundWinner = 'pink';
    gameRoom.pinkRoundsWon++;
  } else {
    roundWinner = 'tie';
  }
  
  // Log round end
  addGameLog(gameRoom, `Round ${gameRoom.currentRound} ended! Yellow: ${yellowScore} points, Pink: ${pinkScore} points. ${roundWinner === 'tie' ? 'It\'s a tie!' : `${roundWinner} team wins this round!`}`);
  
  // Check if game is over
  if (gameRoom.currentRound >= gameRoom.maxRounds || 
      gameRoom.yellowRoundsWon > gameRoom.maxRounds / 2 || 
      gameRoom.pinkRoundsWon > gameRoom.maxRounds / 2) {
    endGame(io, gameRoom);
  } else {
    // Set game state to round-ended
    gameRoom.gameState = 'round-ended';
    
    // Notify all players of round end
    io.to(gameRoom.id).emit('round-ended', {
      yellowScore: yellowScore,
      pinkScore: pinkScore,
      yellowTotal: gameRoom.yellowTotalPoints,
      pinkTotal: gameRoom.pinkTotalPoints,
      yellowRounds: gameRoom.yellowRoundsWon,
      pinkRounds: gameRoom.pinkRoundsWon,
      winner: roundWinner,
      round: gameRoom.currentRound,
      maxRounds: gameRoom.maxRounds
    });
  }
}

// End the game
function endGame(io, gameRoom) {
  // Determine game winner
  let gameWinner = null;
  if (gameRoom.yellowRoundsWon > gameRoom.pinkRoundsWon) {
    gameWinner = 'yellow';
  } else if (gameRoom.pinkRoundsWon > gameRoom.yellowRoundsWon) {
    gameWinner = 'pink';
  } else if (gameRoom.yellowTotalPoints > gameRoom.pinkTotalPoints) {
    gameWinner = 'yellow';
  } else if (gameRoom.pinkTotalPoints > gameRoom.yellowTotalPoints) {
    gameWinner = 'pink';
  } else {
    gameWinner = 'tie';
  }
  
  // Set game state to ended
  gameRoom.gameState = 'game-ended';
  
  // Log game end
  addGameLog(gameRoom, `Game ended! Yellow team: ${gameRoom.yellowRoundsWon} rounds (${gameRoom.yellowTotalPoints} points), Pink team: ${gameRoom.pinkRoundsWon} rounds (${gameRoom.pinkTotalPoints} points). ${gameWinner === 'tie' ? 'It\'s a tie!' : `${gameWinner} team wins the game!`}`);
  
  // Notify all players
  io.to(gameRoom.id).emit('game-ended', {
    yellowScore: gameRoom.yellowRoundsWon,
    pinkScore: gameRoom.pinkRoundsWon,
    yellowTotal: gameRoom.yellowTotalPoints,
    pinkTotal: gameRoom.pinkTotalPoints,
    winner: gameWinner
  });
}

// Add a log entry to the game room
function addGameLog(gameRoom, message) {
  const log = {
    timestamp: new Date(),
    message: message
  };
  gameRoom.logs.push(log);
  return log;
}

module.exports = {
  startNewRound,
  startRoundTimer,
  endRound,
  endGame,
  addGameLog
};
