const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
// Apply CORS middleware to Express
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});


// Multiple game rooms with their own states
let gameRooms = new Map();

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
    yellowDiscardPile: [],
    pinkSharedCards: [
      createCard(getRandomCard(), 'pink'),
      createCard(getRandomCard(), 'pink'),
      createCard(getRandomCard(), 'pink')
    ],
    pinkDiscardPile: [],
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
  
  // Count cards in discard piles (points go to the opposite team)
  board.yellowDiscardPile.forEach(card => {
    if (card.team === 'yellow') pinkScore += card.value;
  });
  
  board.pinkDiscardPile.forEach(card => {
    if (card.team === 'pink') yellowScore += card.value;
  });
  
  return { yellowScore, pinkScore };
}

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
      lastRoundWinner: null,
      lastRoundYellowPoints: 0,
      lastRoundPinkPoints: 0
    });
  }
  return gameRooms.get(gameId);
}

// Function to generate a random game ID
function generateGameId() {
  const adjectives = ['Quick', 'Brave', 'Swift', 'Bold', 'Clever', 'Bright', 'Wild', 'Cool', 'Fast', 'Smart'];
  const nouns = ['Tiger', 'Eagle', 'Shark', 'Wolf', 'Bear', 'Fox', 'Lion', 'Hawk', 'Panther', 'Falcon'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
}

// Function to get list of active games
function getActiveGames() {
  return Array.from(gameRooms.entries()).map(([id, room]) => ({
    id: id,
    name: room.name,
    playerCount: room.players.size,
    gameState: room.gameState,
    yellowRoundsWon: room.yellowRoundsWon,
    pinkRoundsWon: room.pinkRoundsWon,
    yellowTotalPoints: room.yellowTotalPoints,
    pinkTotalPoints: room.pinkTotalPoints,
    createdAt: room.createdAt
  }));
}

// Function to start round timer
function startRoundTimer(gameRoom, io, gameId) {
  // Random timer between 45-75 seconds
  const timerDuration = Math.floor(Math.random() * 31) + 45; // 45-75 seconds
  gameRoom.roundTimeLeft = timerDuration;
  
  gameRoom.roundTimer = setInterval(() => {
    gameRoom.roundTimeLeft -= 1;
    
    // Broadcast time update every 5 seconds or last 10 seconds
    if (gameRoom.roundTimeLeft % 5 === 0 || gameRoom.roundTimeLeft <= 10) {
      io.to(gameId).emit('timer-update', { timeLeft: gameRoom.roundTimeLeft });
    }
    
    if (gameRoom.roundTimeLeft <= 0) {
      clearInterval(gameRoom.roundTimer);
      endRound(gameRoom, io, gameId, 'timer');
    }
  }, 1000);
}

// Function to end round
function endRound(gameRoom, io, gameId, reason = 'both-out') {
  if (gameRoom.roundTimer) {
    clearInterval(gameRoom.roundTimer);
    gameRoom.roundTimer = null;
  }
  
  // Calculate final points for this round
  const finalScores = calculateTeamScores(gameRoom.board);
  gameRoom.yellowCurrentPoints = finalScores.yellowScore;
  gameRoom.pinkCurrentPoints = finalScores.pinkScore;
  
  gameRoom.gameState = 'round-ended';
  
  // Determine round winner based on points and award a round point
  let roundWinner = null;
  if (gameRoom.yellowCurrentPoints > gameRoom.pinkCurrentPoints) {
    roundWinner = 'yellow';
    gameRoom.yellowRoundsWon++;
  } else if (gameRoom.pinkCurrentPoints > gameRoom.yellowCurrentPoints) {
    roundWinner = 'pink';
    gameRoom.pinkRoundsWon++;
  } else {
    roundWinner = 'tie';
  }
  
  // Add current round points to total points
  gameRoom.yellowTotalPoints += gameRoom.yellowCurrentPoints;
  gameRoom.pinkTotalPoints += gameRoom.pinkCurrentPoints;
  
  // Store last round info for display
  gameRoom.lastRoundWinner = roundWinner;
  gameRoom.lastRoundYellowPoints = gameRoom.yellowCurrentPoints;
  gameRoom.lastRoundPinkPoints = gameRoom.pinkCurrentPoints;
  
  gameRoom.currentRound++;
  
  // Check if game is over (first to 3 rounds)
  const gameEnded = gameRoom.yellowRoundsWon >= 3 || gameRoom.pinkRoundsWon >= 3;
  if (gameEnded) {
    gameRoom.gameState = 'game-ended';
  }
  
  // Reset team out status but keep the board for display
  gameRoom.yellowTeamOut = false;
  gameRoom.pinkTeamOut = false;
  
  // Reset all players' ready status for next round
  gameRoom.players.forEach((player) => {
    player.isReady = false;
  });
  
  io.to(gameId).emit('round-ended', {
    roundWinner,
    yellowRoundsWon: gameRoom.yellowRoundsWon,
    pinkRoundsWon: gameRoom.pinkRoundsWon,
    yellowTotalPoints: gameRoom.yellowTotalPoints,
    pinkTotalPoints: gameRoom.pinkTotalPoints,
    yellowCurrentPoints: gameRoom.yellowCurrentPoints,
    pinkCurrentPoints: gameRoom.pinkCurrentPoints,
    gameState: gameRoom.gameState,
    reason,
    gameWinner: gameEnded ? (gameRoom.yellowRoundsWon >= 3 ? 'yellow' : 'pink') : null,
    players: Array.from(gameRoom.players.values()) // Send updated ready status
  });
}

console.log('Server starting...');

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send list of active games to new user
  socket.emit('games-list', getActiveGames());
  
  socket.on('create-game', (data) => {
    const { username, gameName } = data;
    const gameId = generateGameId();
    
    console.log(`User ${username} creating new game: ${gameId}`);
    
    // Create the game room
    const gameRoom = getGameRoom(gameId);
    if (gameName && gameName.trim()) {
      gameRoom.name = gameName.trim();
    }
    
    // Join the socket.io room
    socket.join(gameId);
    
    // Store user info in socket
    socket.gameId = gameId;
    socket.username = username;
    
    // Add player to game (assign to yellow team initially)
    gameRoom.players.set(socket.id, {
      username: username,
      team: 'yellow',
      currentCard: createCard(getRandomCard(), 'yellow'),
      isReady: false
    });
    
    // Send game created confirmation and initial state
    socket.emit('game-created', {
      gameId: gameId,
      gameName: gameRoom.name,
      gameState: gameRoom.gameState,
      players: Array.from(gameRoom.players.values()),
      board: gameRoom.board,
      yellowRoundsWon: gameRoom.yellowRoundsWon,
      pinkRoundsWon: gameRoom.pinkRoundsWon,
      yellowTotalPoints: gameRoom.yellowTotalPoints,
      pinkTotalPoints: gameRoom.pinkTotalPoints,
      yellowCurrentPoints: gameRoom.yellowCurrentPoints,
      pinkCurrentPoints: gameRoom.pinkCurrentPoints,
      playerCard: gameRoom.players.get(socket.id).currentCard
    });
    
    // Broadcast updated games list to all connected users
    io.emit('games-list', getActiveGames());
  });
  
  socket.on('join-game', (data) => {
    const { gameId, username } = data;
    console.log(`User ${username} joining game ${gameId}`);
    
    // Check if game exists
    if (!gameRooms.has(gameId)) {
      socket.emit('game-error', { message: 'Game not found' });
      return;
    }
    
    const gameRoom = getGameRoom(gameId);
    
    // Check if game is full (max 2 players for now, can be expanded)
    if (gameRoom.players.size >= 2) {
      socket.emit('game-error', { message: 'Game is full' });
      return;
    }
    
    // Join the socket.io room
    socket.join(gameId);
    
    // Store user info in socket
    socket.gameId = gameId;
    socket.username = username;
    
    // Assign team (yellow first, then pink)
    const assignedTeam = gameRoom.players.size === 0 ? 'yellow' : 'pink';
    
    // Add player to game
    gameRoom.players.set(socket.id, {
      username: username,
      team: assignedTeam,
      currentCard: createCard(getRandomCard(), assignedTeam),
      isReady: false
    });
    
    // Send current state to the user
    socket.emit('initial-state', {
      gameId: gameId,
      gameName: gameRoom.name,
      gameState: gameRoom.gameState,
      players: Array.from(gameRoom.players.values()),
      board: gameRoom.board,
      yellowRoundsWon: gameRoom.yellowRoundsWon,
      pinkRoundsWon: gameRoom.pinkRoundsWon,
      yellowTotalPoints: gameRoom.yellowTotalPoints,
      pinkTotalPoints: gameRoom.pinkTotalPoints,
      yellowCurrentPoints: gameRoom.yellowCurrentPoints,
      pinkCurrentPoints: gameRoom.pinkCurrentPoints,
      playerCard: gameRoom.players.get(socket.id).currentCard,
      team: assignedTeam
    });
    
    // Notify others in the room that a player joined
    socket.to(gameId).emit('player-joined', {
      username,
      players: Array.from(gameRoom.players.values()),
      yellowRoundsWon: gameRoom.yellowRoundsWon,
      pinkRoundsWon: gameRoom.pinkRoundsWon,
      yellowTotalPoints: gameRoom.yellowTotalPoints,
      pinkTotalPoints: gameRoom.pinkTotalPoints,
      yellowCurrentPoints: gameRoom.yellowCurrentPoints,
      pinkCurrentPoints: gameRoom.pinkCurrentPoints
    });
    
    // Broadcast updated games list to all connected users
    io.emit('games-list', getActiveGames());
  });

  socket.on('player-ready', () => {
    const gameId = socket.gameId;
    if (!gameId) return;
    
    const gameRoom = getGameRoom(gameId);
    const player = gameRoom.players.get(socket.id);
    
    if (player) {
      player.isReady = true;
      
      // Check if all players are ready and we have at least 2 players
      const allReady = Array.from(gameRoom.players.values()).every(p => p.isReady);
      const hasEnoughPlayers = gameRoom.players.size >= 2;
      
      if (allReady && hasEnoughPlayers && gameRoom.gameState === 'waiting') {
        gameRoom.gameState = 'playing';
        gameRoom.currentRound = 1;
        startRoundTimer(gameRoom, io, gameId);
        
        io.to(gameId).emit('game-started', {
          gameState: gameRoom.gameState,
          timeLeft: gameRoom.roundTimeLeft,
          yellowRoundsWon: gameRoom.yellowRoundsWon,
          pinkRoundsWon: gameRoom.pinkRoundsWon,
          yellowTotalPoints: gameRoom.yellowTotalPoints,
          pinkTotalPoints: gameRoom.pinkTotalPoints
        });
      }
      
      // Broadcast player ready status
      io.to(gameId).emit('player-ready-update', {
        players: Array.from(gameRoom.players.values()),
        allReady: allReady && hasEnoughPlayers,
        yellowRoundsWon: gameRoom.yellowRoundsWon,
        pinkRoundsWon: gameRoom.pinkRoundsWon,
        yellowTotalPoints: gameRoom.yellowTotalPoints,
        pinkTotalPoints: gameRoom.pinkTotalPoints,
        yellowCurrentPoints: gameRoom.yellowCurrentPoints,
        pinkCurrentPoints: gameRoom.pinkCurrentPoints
      });
    }
  });

  socket.on('play-card', (data) => {
    const gameId = socket.gameId;
    const { targetPosition, targetRow } = data; // targetPosition: 0-2, targetRow: 'yellow' or 'pink'
    
    if (!gameId || !gameRooms.has(gameId)) return;
    
    const gameRoom = getGameRoom(gameId);
    const player = gameRoom.players.get(socket.id);
    
    if (!player || gameRoom.gameState !== 'playing') return;
    
    // Check if player's team has gone out
    if ((player.team === 'yellow' && gameRoom.yellowTeamOut) || 
        (player.team === 'pink' && gameRoom.pinkTeamOut)) {
      return;
    }
    
    // Get target card value
    let targetCard;
    if (targetRow === 'yellow') {
      targetCard = gameRoom.board.yellowSharedCards[targetPosition];
    } else if (targetRow === 'pink') {
      targetCard = gameRoom.board.pinkSharedCards[targetPosition];
    } else {
      return; // Invalid target
    }
    
    // Check if play is valid (+1 or -1, or 1-8 swap)
    const playerCard = player.currentCard;
    if (Math.abs(playerCard.number - targetCard.number) !== 1 && 
        !((playerCard.number === 1 && targetCard.number === 8) || 
          (playerCard.number === 8 && targetCard.number === 1))) {
      socket.emit('invalid-play', { message: 'Card must be +1 or -1 from target, or 1 can be played on 8 (and vice versa)' });
      return;
    }
    
    // Make the play - the new card keeps the player's team color
    const newCard = createCard(playerCard.number, player.team);
    
    if (targetRow === 'yellow') {
      gameRoom.board.yellowSharedCards[targetPosition] = newCard;
    } else {
      gameRoom.board.pinkSharedCards[targetPosition] = newCard;
    }
    
    // Give player a new card
    player.currentCard = createCard(getRandomCard(), player.team);
    
    // Calculate current scores
    const currentScores = calculateTeamScores(gameRoom.board);
    gameRoom.yellowCurrentPoints = currentScores.yellowScore;
    gameRoom.pinkCurrentPoints = currentScores.pinkScore;
    
    // Add to log
    const logEntry = {
      id: Date.now(),
      username: player.username,
      team: player.team,
      action: `played ${player.team} ${playerCard.number} (value: ${playerCard.value}) on ${targetRow} row position ${targetPosition + 1}`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    gameRoom.logs.unshift(logEntry);
    if (gameRoom.logs.length > 20) {
      gameRoom.logs = gameRoom.logs.slice(0, 20);
    }
    
    // Broadcast the play to all players
    io.to(gameId).emit('card-played', {
      board: gameRoom.board,
      logs: gameRoom.logs,
      playerId: socket.id,
      newPlayerCard: playerCard, // The card that was played
      yellowCurrentPoints: gameRoom.yellowCurrentPoints,
      pinkCurrentPoints: gameRoom.pinkCurrentPoints
    });
    
    // Send new card only to the player who played
    socket.emit('new-card', { newCard: player.currentCard });
  });

  socket.on('discard-card', () => {
    const gameId = socket.gameId;
    if (!gameId || !gameRooms.has(gameId)) return;
    
    const gameRoom = getGameRoom(gameId);
    const player = gameRoom.players.get(socket.id);
    
    if (!player || gameRoom.gameState !== 'playing') return;
    
    // Check if player's team has gone out
    if ((player.team === 'yellow' && gameRoom.yellowTeamOut) || 
        (player.team === 'pink' && gameRoom.pinkTeamOut)) {
      return;
    }
    
    const playerCard = player.currentCard;
    
    // Add the card to the appropriate discard pile
    if (player.team === 'yellow') {
      gameRoom.board.yellowDiscardPile.push(playerCard);
    } else {
      gameRoom.board.pinkDiscardPile.push(playerCard);
    }
    
    // Give player a new card
    player.currentCard = createCard(getRandomCard(), player.team);
    
    // Calculate current scores (discard points go to the opponent)
    const currentScores = calculateTeamScores(gameRoom.board);
    gameRoom.yellowCurrentPoints = currentScores.yellowScore;
    gameRoom.pinkCurrentPoints = currentScores.pinkScore;
    
    // Add to log
    const logEntry = {
      id: Date.now(),
      username: player.username,
      team: player.team,
      action: `discarded ${player.team} ${playerCard.number} (value: ${playerCard.value})`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    gameRoom.logs.unshift(logEntry);
    if (gameRoom.logs.length > 20) {
      gameRoom.logs = gameRoom.logs.slice(0, 20);
    }
    
    // Broadcast the discard to all players
    io.to(gameId).emit('card-discarded', {
      board: gameRoom.board,
      logs: gameRoom.logs,
      playerId: socket.id,
      discardedCard: playerCard,
      yellowCurrentPoints: gameRoom.yellowCurrentPoints,
      pinkCurrentPoints: gameRoom.pinkCurrentPoints
    });
    
    // Send new card only to the player who discarded
    socket.emit('new-card', { newCard: player.currentCard });
  });

  socket.on('team-go-out', () => {
    const gameId = socket.gameId;
    if (!gameId) return;
    
    const gameRoom = getGameRoom(gameId);
    const player = gameRoom.players.get(socket.id);
    
    if (!player || gameRoom.gameState !== 'playing') return;
    
    if (player.team === 'yellow') {
      gameRoom.yellowTeamOut = true;
    } else if (player.team === 'pink') {
      gameRoom.pinkTeamOut = true;
    }
    
    // Add to log
    const logEntry = {
      id: Date.now(),
      username: player.username,
      team: player.team,
      action: `${player.team} team went out!`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    gameRoom.logs.unshift(logEntry);
    
    // Broadcast team going out
    io.to(gameId).emit('team-went-out', {
      team: player.team,
      yellowTeamOut: gameRoom.yellowTeamOut,
      pinkTeamOut: gameRoom.pinkTeamOut,
      logs: gameRoom.logs
    });
    
    // Check if both teams are out or if we should end the round
    if (gameRoom.yellowTeamOut && gameRoom.pinkTeamOut) {
      endRound(gameRoom, io, gameId, 'both-out');
    }
  });

  socket.on('start-next-round', () => {
    const gameId = socket.gameId;
    if (!gameId) return;
    
    const gameRoom = getGameRoom(gameId);
    const player = gameRoom.players.get(socket.id);
    
    if (!player) return;
    
    // Mark player as ready for next round
    player.isReady = true;
    
    // Check if all players are ready
    const allReady = Array.from(gameRoom.players.values()).every(p => p.isReady);
    const hasEnoughPlayers = gameRoom.players.size >= 2;
    
    // Broadcast ready status
    io.to(gameId).emit('next-round-ready-update', {
      players: Array.from(gameRoom.players.values()),
      allReady: allReady && hasEnoughPlayers,
      yellowRoundsWon: gameRoom.yellowRoundsWon,
      pinkRoundsWon: gameRoom.pinkRoundsWon,
      yellowTotalPoints: gameRoom.yellowTotalPoints,
      pinkTotalPoints: gameRoom.pinkTotalPoints,
      lastRoundWinner: gameRoom.lastRoundWinner,
      lastRoundYellowPoints: gameRoom.lastRoundYellowPoints,
      lastRoundPinkPoints: gameRoom.lastRoundPinkPoints
    });
    
    // If everyone is ready and game should continue
    if (allReady && hasEnoughPlayers && 
        gameRoom.gameState === 'round-ended' && 
        gameRoom.yellowRoundsWon < 3 && gameRoom.pinkRoundsWon < 3) {
      
      // Start new round
      gameRoom.gameState = 'playing';
      gameRoom.board = initializeGameBoard();
      gameRoom.yellowCurrentPoints = 0;
      gameRoom.pinkCurrentPoints = 0;
      
      // Give each player a new card
      gameRoom.players.forEach((player, playerId) => {
        player.currentCard = createCard(getRandomCard(), player.team);
        player.isReady = false; // Reset for game
      });
      
      startRoundTimer(gameRoom, io, gameId);
      
      io.to(gameId).emit('round-started', {
        gameState: gameRoom.gameState,
        board: gameRoom.board,
        timeLeft: gameRoom.roundTimeLeft,
        round: gameRoom.currentRound,
        yellowRoundsWon: gameRoom.yellowRoundsWon,
        pinkRoundsWon: gameRoom.pinkRoundsWon,
        yellowTotalPoints: gameRoom.yellowTotalPoints,
        pinkTotalPoints: gameRoom.pinkTotalPoints,
        yellowCurrentPoints: gameRoom.yellowCurrentPoints,
        pinkCurrentPoints: gameRoom.pinkCurrentPoints
      });
      
      // Send new cards to players
      gameRoom.players.forEach((player, playerId) => {
        io.to(playerId).emit('new-card', { newCard: player.currentCard });
      });
    }
  });

  socket.on('increment-counter', (data) => {
    // Legacy counter functionality - can be removed if not needed
    const gameId = socket.gameId;
    const username = socket.username;
    
    if (!gameId || !username) {
      console.log('User not in a game room');
      return;
    }
    
    console.log('Received increment from:', username, 'in game:', gameId);

    const gameRoom = getGameRoom(gameId);
    
    // Add to log
    const logEntry = {
      id: Date.now(),
      username: username, 
      action: 'incremented counter',
      timestamp: new Date().toLocaleTimeString()
    }

    gameRoom.logs.unshift(logEntry);
    if (gameRoom.logs.length > 10) {
      gameRoom.logs = gameRoom.logs.slice(0,10);
    }

    // Broadcast update to all players in this game room
    io.to(gameId).emit('counter-updated', {
      logs: gameRoom.logs
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.gameId && socket.username) {
      const gameRoom = getGameRoom(socket.gameId);
      const disconnectedPlayer = gameRoom.players.get(socket.id);
      
      if (disconnectedPlayer) {
        gameRoom.players.delete(socket.id);
        
        // If game was in progress and there are still players, give automatic win
        if (gameRoom.players.size > 0 && gameRoom.gameState === 'playing') {
          const remainingPlayer = Array.from(gameRoom.players.values())[0];
          const winningTeam = remainingPlayer.team;
          
          // Set the winning team's score to 3 (automatic win)
          if (winningTeam === 'yellow') {
            gameRoom.yellowRoundsWon = 3;
          } else {
            gameRoom.pinkRoundsWon = 3;
          }
          
          gameRoom.gameState = 'game-ended';
          
          // Clear any running timer
          if (gameRoom.roundTimer) {
            clearInterval(gameRoom.roundTimer);
            gameRoom.roundTimer = null;
          }
          
          // Notify remaining player
          socket.to(socket.gameId).emit('player-disconnected', {
            disconnectedPlayer: disconnectedPlayer.username,
            winner: winningTeam,
            yellowRoundsWon: gameRoom.yellowRoundsWon,
            pinkRoundsWon: gameRoom.pinkRoundsWon,
            yellowTotalPoints: gameRoom.yellowTotalPoints,
            pinkTotalPoints: gameRoom.pinkTotalPoints,
            gameState: gameRoom.gameState
          });
        } else {
          // Just notify that player left
          socket.to(socket.gameId).emit('player-left', {
            username: socket.username,
            players: Array.from(gameRoom.players.values())
          });
        }
        
        // If game is empty, remove it after 5 minutes
        if (gameRoom.players.size === 0) {
          setTimeout(() => {
            if (gameRooms.has(socket.gameId) && gameRooms.get(socket.gameId).players.size === 0) {
              console.log(`Removing empty game: ${socket.gameId}`);
              gameRooms.delete(socket.gameId);
              io.emit('games-list', getActiveGames());
            }
          }, 5 * 60 * 1000); // 5 minutes
        } else {
          // Broadcast updated games list
          io.emit('games-list', getActiveGames());
        }
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running.`);
});

