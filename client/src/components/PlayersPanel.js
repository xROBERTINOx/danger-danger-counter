// Players list and ready status component
import React from 'react';

const PlayersPanel = ({ 
  players, 
  playerTeam, 
  socket, 
  gameState, 
  isReady, 
  setPlayerReady, 
  allPlayersReady, 
  waitingForNextRound 
}) => {
  const yellowPlayers = players.filter(p => p.team === 'yellow');
  const pinkPlayers = players.filter(p => p.team === 'pink');

  // Check if current player is in the list
  const currentPlayer = players.find(p => p.id === socket?.id);

  return (
    <div className="players-panel">
      <h2>Players</h2>
      
      <div className="teams-container">
        <div className="team yellow-team">
          <h3>Yellow Team</h3>
          <ul>
            {yellowPlayers.map(player => (
              <li key={player.id} className={player.isReady ? 'ready' : ''}>
                {player.username}
                {player.id === socket?.id && ' (you)'}
                {player.isReady && ' ✓'}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="team pink-team">
          <h3>Pink Team</h3>
          <ul>
            {pinkPlayers.map(player => (
              <li key={player.id} className={player.isReady ? 'ready' : ''}>
                {player.username}
                {player.id === socket?.id && ' (you)'}
                {player.isReady && ' ✓'}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {currentPlayer && (gameState === 'waiting' || gameState === 'round-ended') && (
        <div className="ready-controls">
          <button 
            className={isReady ? 'ready-button active' : 'ready-button'}
            onClick={() => setPlayerReady(!isReady)}
          >
            {isReady ? 'Not Ready' : 'Ready'}
          </button>
          
          {waitingForNextRound && (
            <div className="waiting-message">
              {allPlayersReady 
                ? 'Starting next round...' 
                : 'Waiting for all players to be ready...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayersPanel;
