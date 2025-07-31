// Board and game play component
import React from 'react';

const GameBoard = ({ 
  playerTeam, 
  board, 
  swapCards, 
  yellowTeamOut, 
  pinkTeamOut,
  callTeamOut,
  discardCard,
  yellowCurrentPoints,
  pinkCurrentPoints,
  gameState,
  timeLeft
}) => {
  const renderCard = (card, position, canDrag = false) => {
    const handleDragStart = canDrag ? (e) => {
      e.dataTransfer.setData('position', position);
    } : null;

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = (e) => {
      const fromPosition = e.dataTransfer.getData('position');
      if (fromPosition !== position) {
        swapCards(fromPosition, position);
      }
    };

    const classes = [
      'card',
      `team-${card.team}`,
      canDrag ? 'draggable' : '',
      position.includes('shared') ? 'shared-card' : 'player-card'
    ].join(' ');

    return (
      <div
        className={classes}
        draggable={canDrag && gameState === 'playing'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="card-number">{card.number}</div>
        <div className="card-value">{card.value}</div>
      </div>
    );
  };

  // Determine which cards the current player can move
  const canMoveYellow = playerTeam === 'yellow' && gameState === 'playing';
  const canMovePink = playerTeam === 'pink' && gameState === 'playing';
  const isTeamOut = playerTeam === 'yellow' ? yellowTeamOut : pinkTeamOut;

  return (
    <div className="game-board">
      <div className="game-status">
        <div className="timer">Time left: {timeLeft}s</div>
        <div className="scores">
          <div className="yellow-score">Yellow: {yellowCurrentPoints}</div>
          <div className="pink-score">Pink: {pinkCurrentPoints}</div>
        </div>
      </div>

      <div className="board-container">
        <div className="yellow-section">
          <div className="player-area">
            {renderCard(board.yellowPlayerCard, 'yellow-player', canMoveYellow)}
            
            {/* Yellow Discard Pile */}
            <div className="discard-area">
              <div className="discard-pile yellow-discard">
                <h4>Yellow Discards</h4>
                <div className="discard-cards">
                  {board.yellowDiscardPile && board.yellowDiscardPile.map((card, index) => (
                    <div key={`yellow-discard-${index}`} className={`card mini-card team-${card.team}`}>
                      <div className="card-number">{card.number}</div>
                      <div className="card-value">{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="shared-area">
            {board.yellowSharedCards.map((card, index) => 
              renderCard(card, `yellow-shared-${index}`, canMoveYellow)
            )}
          </div>
        </div>

        <div className="center-section">
          {gameState === 'playing' && playerTeam && !isTeamOut && (
            <>
              <button 
                className={`team-out-button ${playerTeam}`}
                onClick={callTeamOut}
              >
                Call {playerTeam} team out!
              </button>
              
              <button 
                className={`discard-button ${playerTeam}`}
                onClick={discardCard}
              >
                Discard card
              </button>
            </>
          )}
          {gameState === 'playing' && isTeamOut && (
            <div className="waiting-message">
              Waiting for the other team...
            </div>
          )}
          {yellowTeamOut && <div className="team-out yellow">Yellow team is out!</div>}
          {pinkTeamOut && <div className="team-out pink">Pink team is out!</div>}
        </div>

        <div className="pink-section">
          <div className="shared-area">
            {board.pinkSharedCards.map((card, index) => 
              renderCard(card, `pink-shared-${index}`, canMovePink)
            )}
          </div>
          <div className="player-area">
            {renderCard(board.pinkPlayerCard, 'pink-player', canMovePink)}
            
            {/* Pink Discard Pile */}
            <div className="discard-area">
              <div className="discard-pile pink-discard">
                <h4>Pink Discards</h4>
                <div className="discard-cards">
                  {board.pinkDiscardPile && board.pinkDiscardPile.map((card, index) => (
                    <div key={`pink-discard-${index}`} className={`card mini-card team-${card.team}`}>
                      <div className="card-number">{card.number}</div>
                      <div className="card-value">{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
