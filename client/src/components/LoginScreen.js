// Login and game selection component
import React, { useState, useEffect } from 'react';

const LoginScreen = ({ 
  username, 
  setUsername, 
  isConnected, 
  availableGames, 
  createGame, 
  joinGame,
  refreshGamesList 
}) => {
  const [newGameName, setNewGameName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');

  // Refresh games list when component mounts and when connection status changes
  useEffect(() => {
    if (isConnected) {
      refreshGamesList();
      // Set up periodic refresh
      const interval = setInterval(refreshGamesList, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, refreshGamesList]);

  const handleCreateGame = (e) => {
    e.preventDefault();
    if (!username) {
      alert('Please enter a username');
      return;
    }
    createGame(username, newGameName);
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (!username) {
      alert('Please enter a username');
      return;
    }
    if (!selectedGameId) {
      alert('Please select a game to join');
      return;
    }
    joinGame(username, selectedGameId);
  };

  return (
    <div className="login-container">
      <h1>Danger Danger Counter</h1>
      <div className="connection-status">
        <span>Connection status: </span>
        <span className={isConnected ? "connected" : "disconnected"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="login-form">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="game-options">
          <div className="create-game">
            <h3>Create a new game</h3>
            <input
              type="text"
              placeholder="Game name (optional)"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
            />
            <button 
              onClick={handleCreateGame} 
              disabled={!isConnected || !username}
            >
              Create Game
            </button>
          </div>

          <div className="join-game">
            <h3>Or join an existing game</h3>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              <option value="">Select a game...</option>
              {availableGames
                .filter(game => game.gameState === 'waiting')
                .map(game => (
                  <option key={game.id} value={game.id}>
                    {game.name} ({game.playerCount} players)
                  </option>
                ))}
            </select>
            <button 
              onClick={handleJoinGame} 
              disabled={!isConnected || !username || !selectedGameId}
            >
              Join Game
            </button>
          </div>
        </div>

        <button 
          onClick={refreshGamesList} 
          disabled={!isConnected}
          className="refresh-button"
        >
          Refresh Games List
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
