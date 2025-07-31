// Round end and game end screens
import React from 'react';

const ResultsScreen = ({ 
  gameState, 
  lastRoundInfo, 
  yellowScore, 
  pinkScore, 
  yellowTotalPoints, 
  pinkTotalPoints,
  setPlayerReady,
  isReady
}) => {
  if (!lastRoundInfo) return null;

  if (gameState === 'round-ended') {
    return (
      <div className="results-screen round-ended">
        <h2>Round {lastRoundInfo.round} Ended!</h2>
        
        <div className="round-scores">
          <div className="team-score yellow">
            <h3>Yellow Team</h3>
            <div className="points">{lastRoundInfo.yellowScore} points</div>
          </div>
          
          <div className="team-score pink">
            <h3>Pink Team</h3>
            <div className="points">{lastRoundInfo.pinkScore} points</div>
          </div>
        </div>
        
        <div className="round-winner">
          {lastRoundInfo.winner === 'tie' ? (
            <h3>It's a tie!</h3>
          ) : (
            <h3>{lastRoundInfo.winner.toUpperCase()} team wins this round!</h3>
          )}
        </div>
        
        <div className="overall-scores">
          <h3>Overall Score</h3>
          <div className="scores">
            <div>Yellow: {yellowScore} rounds ({yellowTotalPoints} points)</div>
            <div>Pink: {pinkScore} rounds ({pinkTotalPoints} points)</div>
          </div>
        </div>
        
        <button 
          className={isReady ? 'ready-button active' : 'ready-button'} 
          onClick={() => setPlayerReady(!isReady)}
        >
          {isReady ? 'Not Ready' : 'Ready for Next Round'}
        </button>
      </div>
    );
  }
  
  if (gameState === 'game-ended') {
    return (
      <div className="results-screen game-ended">
        <h2>Game Over!</h2>
        
        <div className="final-scores">
          <div className="team-score yellow">
            <h3>Yellow Team</h3>
            <div>Rounds Won: {yellowScore}</div>
            <div>Total Points: {yellowTotalPoints}</div>
          </div>
          
          <div className="team-score pink">
            <h3>Pink Team</h3>
            <div>Rounds Won: {pinkScore}</div>
            <div>Total Points: {pinkTotalPoints}</div>
          </div>
        </div>
        
        <div className="game-winner">
          {lastRoundInfo.winner === 'tie' ? (
            <h2>It's a tie!</h2>
          ) : (
            <h2>{lastRoundInfo.winner.toUpperCase()} team wins the game!</h2>
          )}
        </div>
      </div>
    );
  }
  
  return null;
};

export default ResultsScreen;
