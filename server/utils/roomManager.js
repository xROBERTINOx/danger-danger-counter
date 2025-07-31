// Room manager for handling game rooms
const { initializeGameBoard } = require('./gameLogic');

// Map to store all game rooms
const gameRooms = new Map();

// Function to get or create a game room
function getGameRoom(gameId) {
  if (!gameRooms.has(gameId)) {
    gameRooms.set(gameId, {
      id: gameId,
      name: gameId,
      players: new Map(), // playerId -> {username, team, isReady}
      gameState: 'waiting', // 'waiting', 'playing', 'round-ended', 'game-ended'
      board: initializeGameBoard(),
      yellowRoundsWon: 0, // rounds won
      pinkRoundsWon: 0, // rounds won
      yellowTotalPoints: 0, // total points scored across all rounds
      pinkTotalPoints: 0, // total points scored across all rounds
      yellowCurrentPoints: 0, // current round points
      pinkCurrentPoints: 0, // current round points
      roundTimer: null,
      roundTimeLeft: 0,
      yellowTeamOut: false,
      pinkTeamOut: false,
      logs: [],
      createdAt: new Date(),
      currentRound: 0,
      maxRounds: 3
    });
  }
  return gameRooms.get(gameId);
}

// Get all available game rooms
function getAllGameRooms() {
  const rooms = [];
  gameRooms.forEach((room, id) => {
    rooms.push({
      id: room.id,
      name: room.name,
      playerCount: room.players.size,
      gameState: room.gameState,
      createdAt: room.createdAt
    });
  });
  return rooms;
}

// Delete a game room
function deleteGameRoom(gameId) {
  if (gameRooms.has(gameId)) {
    const room = gameRooms.get(gameId);
    // Clear any timers
    if (room.roundTimer) {
      clearInterval(room.roundTimer);
    }
    gameRooms.delete(gameId);
    return true;
  }
  return false;
}

module.exports = {
  gameRooms,
  getGameRoom,
  getAllGameRooms,
  deleteGameRoom
};
