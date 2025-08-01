// Game handlers for socket.io events
const Counter = require('../game/counter');
const { getGameRoom, getAllGameRooms, gameRooms, deleteGameRoom } = require('../utils/roomManager');
const { startNewRound, endRound, addGameLog } = require('../utils/roundManager');

// Set up socket event handlers
function setupGameHandlers(io, socket) {
  // Get available games
  socket.on('get-games', () => {
    socket.emit('games-list', getAllGameRooms());
  });
  
  // Create a new game
  socket.on('create-game', ({ username, gameName }) => {
    if (!username || username.trim() === '') {
      socket.emit('game-error', { message: 'Username is required' });
      return;
    }
    
    const gameId = generateGameId();
    const gameRoom = getGameRoom(gameId);
    gameRoom.name = gameName || `Game ${gameId}`;
    
    // Add player to yellow team
    gameRoom.players.set(socket.id, {
      username: username,
      team: 'yellow',
      isReady: false
    });
    
    // Join socket room
    socket.join(gameId);
    
    // Log game creation
    addGameLog(gameRoom, `Game created by ${username}`);
    
    // Send initial game state
    const playerData = Counter.getPlayerData(gameRoom, socket);
    socket.emit('game-created', {
      ...Counter.getGameState(gameRoom),
      playerCard: playerData?.playerCard
    });
    
    // Broadcast updated games list
    io.emit('games-list', getAllGameRooms());
  });
  
  // Join an existing game
  socket.on('join-game', ({ username, gameId }) => {
    if (!username || username.trim() === '') {
      socket.emit('game-error', { message: 'Username is required' });
      return;
    }
    
    if (!gameRooms.has(gameId)) {
      socket.emit('game-error', { message: 'Game not found' });
      return;
    }
    
    const gameRoom = getGameRoom(gameId);
    
    // Check if game is full or already started
    if (gameRoom.players.size >= 6) {
      socket.emit('game-error', { message: 'Game is full' });
      return;
    }
    
    if (gameRoom.gameState !== 'waiting') {
      socket.emit('game-error', { message: 'Game has already started' });
      return;
    }
    
    // Determine team based on balance
    const teamBalance = Counter.checkTeamBalance(gameRoom);
    const team = teamBalance.yellow <= teamBalance.pink ? 'yellow' : 'pink';
    
    // Add player
    gameRoom.players.set(socket.id, {
      username: username,
      team: team,
      isReady: false
    });
    
    // Join socket room
    socket.join(gameId);
    
    // Log player joining
    addGameLog(gameRoom, `${username} joined the game on ${team} team`);
    
    // Get player-specific data
    const playerData = Counter.getPlayerData(gameRoom, socket);
    
    // Send initial game state to the joining player
    socket.emit('initial-state', {
      ...Counter.getGameState(gameRoom),
      playerCard: playerData?.playerCard
    });
    
    // Notify other players
    socket.to(gameId).emit('player-joined', {
      username: username,
      team: team,
      players: Counter.getGameState(gameRoom).players
    });
    
    // Broadcast updated games list
    io.emit('games-list', getAllGameRooms());
  });
  
  // Player ready status toggle
  socket.on('player-ready', ({ ready }) => {
    // Find game room this player is in
    const gameRoom = findGameRoomByPlayerId(socket.id);
    if (!gameRoom) {
      socket.emit('game-error', { message: 'You are not in a game' });
      return;
    }
    
    // Update player ready status
    const player = gameRoom.players.get(socket.id);
    player.isReady = ready;
    
    // Log player ready status
    addGameLog(gameRoom, `${player.username} is ${ready ? 'ready' : 'not ready'}`);
    
    // Check if all players are ready
    const allReady = Counter.allPlayersReady(gameRoom);
    
    // Notify all players
    io.to(gameRoom.id).emit('player-ready-update', {
      playerId: socket.id,
      isReady: ready,
      allPlayersReady: allReady
    });
    
    // If all players are ready, start the game
    if (allReady && gameRoom.gameState === 'waiting' && gameRoom.players.size >= 2) {
      startNewRound(io, gameRoom);
    }
    
    // If all players are ready after a round, start next round
    if (allReady && gameRoom.gameState === 'round-ended') {
      startNewRound(io, gameRoom);
    }
  });
  
  // Swap cards
  socket.on('swap-cards', ({ from, to }) => {
    // Find game room this player is in
    const gameRoom = findGameRoomByPlayerId(socket.id);
    if (!gameRoom) {
      socket.emit('game-error', { message: 'You are not in a game' });
      return;
    }
    
    // Check if game is in playing state
    if (gameRoom.gameState !== 'playing') {
      socket.emit('game-error', { message: 'Game is not in playing state' });
      return;
    }
    
    // Get player
    const player = gameRoom.players.get(socket.id);
    
    // Check if player is trying to move a card from their team
    const allowedPositions = [];
    
    // Add player card
    if (player.team === 'yellow') {
      allowedPositions.push('yellow-player');
      // Add all 10 shared cards positions
      for (let i = 0; i < 10; i++) {
        allowedPositions.push(`yellow-shared-${i}`);
      }
    } else {
      allowedPositions.push('pink-player');
      // Add all 10 shared cards positions
      for (let i = 0; i < 10; i++) {
        allowedPositions.push(`pink-shared-${i}`);
      }
    }
    
    if (!allowedPositions.includes(from)) {
      socket.emit('game-error', { message: 'You can only move cards from your team' });
      return;
    }
    
    // Perform swap
    const swapped = Counter.swapCards(gameRoom, from, to);
    
    if (swapped) {
      // Log the swap
      addGameLog(gameRoom, `${player.username} swapped cards from ${from} to ${to}`);
      
      // Update all clients with new board state
      io.to(gameRoom.id).emit('board-updated', {
        board: gameRoom.board
      });
    } else {
      socket.emit('game-error', { message: 'Invalid swap' });
    }
  });
  
  // Team out (when a team wants to end the round)
  socket.on('team-out', () => {
    // Find game room this player is in
    const gameRoom = findGameRoomByPlayerId(socket.id);
    if (!gameRoom) {
      socket.emit('game-error', { message: 'You are not in a game' });
      return;
    }
    
    // Check if game is in playing state
    if (gameRoom.gameState !== 'playing') {
      socket.emit('game-error', { message: 'Game is not in playing state' });
      return;
    }
    
    // Get player and team
    const player = gameRoom.players.get(socket.id);
    const team = player.team;
    
    // Set team out
    if (team === 'yellow') {
      gameRoom.yellowTeamOut = true;
      addGameLog(gameRoom, `Yellow team called out! (by ${player.username})`);
    } else if (team === 'pink') {
      gameRoom.pinkTeamOut = true;
      addGameLog(gameRoom, `Pink team called out! (by ${player.username})`);
    }
    
    // Notify all players
    io.to(gameRoom.id).emit('team-out-update', {
      yellowTeamOut: gameRoom.yellowTeamOut,
      pinkTeamOut: gameRoom.pinkTeamOut
    });
    
    // If both teams are out, end the round
    if (gameRoom.yellowTeamOut && gameRoom.pinkTeamOut) {
      endRound(io, gameRoom);
    }
  });
  
  // Handle player disconnect
  socket.on('disconnect', () => {
    // Find game room this player is in
    const gameRoom = findGameRoomByPlayerId(socket.id);
    if (!gameRoom) return;
    
    const player = gameRoom.players.get(socket.id);
    
    // Log player leaving
    addGameLog(gameRoom, `${player.username} left the game`);
    
    // Remove player
    gameRoom.players.delete(socket.id);
    
    // If game is empty, remove it
    if (gameRoom.players.size === 0) {
      deleteGameRoom(gameRoom.id);
      io.emit('games-list', getAllGameRooms());
      return;
    }
    
    // Notify other players
    socket.to(gameRoom.id).emit('player-left', {
      username: player.username,
      players: Counter.getGameState(gameRoom).players
    });
    
    // Broadcast updated games list
    io.emit('games-list', getAllGameRooms());
  });
}

// Helper function to find game room by player ID
function findGameRoomByPlayerId(playerId) {
  let foundRoom = null;
  gameRooms.forEach((room) => {
    if (room.players.has(playerId)) {
      foundRoom = room;
    }
  });
  return foundRoom;
}

// Generate unique game ID
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = { setupGameHandlers };
