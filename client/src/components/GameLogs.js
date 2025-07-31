// Game logs component
import React from 'react';

const GameLogs = ({ logs }) => {
  return (
    <div className="game-logs">
      <h3>Game Logs</h3>
      <div className="logs-container">
        {logs.length > 0 ? (
          <ul>
            {logs.map((log, index) => (
              <li key={index}>
                {new Date(log.timestamp).toLocaleTimeString()}: {log.message}
              </li>
            ))}
          </ul>
        ) : (
          <p>No logs yet</p>
        )}
      </div>
    </div>
  );
};

export default GameLogs;
