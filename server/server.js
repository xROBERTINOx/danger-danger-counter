const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});


// Simple in-memory counter state
let gameState = {
  counter: 0,
  logs: []
};

console.log('Server starting...');

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send current state to new user
  socket.emit('initial-state', gameState);
  console.log('Sent initial state to:', socket.id, gameState);

  socket.on('increment-counter', (data) => {
    console.log('Received increment from:', data.username, 'Socket ID:', socket.id);

    // Update counter
    gameState.counter += 1;

    // Add to log
    const logEntry = {
      id: Date.now(),
      username: data.username, 
      action: 'added +1',
      timestamp: new Date().toLocaleTimeString(),
      newTotal: gameState.counter
    }

    console.log('Creating log entry:', logEntry);

    // Make sure we're adding to the logs array properly
    if (!gameState.logs) {
      gameState.logs = []; // Initialize if undefined
    }

    gameState.logs.unshift(logEntry); // Add to beginning

    console.log('Logs after adding:', gameState.logs);
    console.log('Number of logs:', gameState.logs.length);

    // Keep only last 10 log entries
    if (gameState.logs.length > 10) {
      gameState.logs = gameState.logs.slice(0,10);
    }

    console.log('Updated game state:', gameState);
    console.log('Broadcasting to all users...');

    // Broadcast to all connected users
    io.emit('counter-updated', gameState);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log('Server running on http://localhost:${PORT}');
  console.log('Initial counter state:', gameState);
});
  
