import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

function CounterApp() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [gameId, setGameId] = useState('');
  const [gameName, setGameName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [availableGames, setAvailableGames] = useState([]);
  
  // Game state
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'round-ended', 'game-ended'
  const [players, setPlayers] = useState([]);
  const [playerTeam, setPlayerTeam] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [board, setBoard] = useState({
    yellowPlayerCard: { number: 0, value: 0, team: 'yellow' },
    yellowSharedCards: [
      { number: 0, value: 0, team: 'yellow' },
      { number: 0, value: 0, team: 'yellow' },
      { number: 0, value: 0, team: 'yellow' }
    ],
    yellowDiscardPile: [],
    pinkSharedCards: [
      { number: 0, value: 0, team: 'pink' },
      { number: 0, value: 0, team: 'pink' },
      { number: 0, value: 0, team: 'pink' }
    ],
    pinkDiscardPile: [],
    pinkPlayerCard: { number: 0, value: 0, team: 'pink' }
  });
  const [yellowScore, setYellowScore] = useState(0); // rounds won
  const [pinkScore, setPinkScore] = useState(0); // rounds won
  const [yellowTotalPoints, setYellowTotalPoints] = useState(0); // total points across all rounds
  const [pinkTotalPoints, setPinkTotalPoints] = useState(0); // total points across all rounds
  const [yellowCurrentPoints, setYellowCurrentPoints] = useState(0); // current round points
  const [pinkCurrentPoints, setPinkCurrentPoints] = useState(0); // current round points
  const [yellowTeamOut, setYellowTeamOut] = useState(false);
  const [pinkTeamOut, setPinkTeamOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [waitingForNextRound, setWaitingForNextRound] = useState(false);
  const [lastRoundInfo, setLastRoundInfo] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    // const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const SERVER_URL = "http://192.168.1.147:3001"
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    console.log('Connecting to server...');

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('games-list', (games) => {
      console.log('Received games list:', games);
      setAvailableGames(games);
    });

    newSocket.on('game-created', (data) => {
      console.log('Game created:', data);
      setGameId(data.gameId);
      setGameName(data.gameName);
      setGameState(data.gameState);
      setPlayers(data.players);
      setBoard(data.board);
      setYellowScore(data.yellowRoundsWon);
      setPinkScore(data.pinkRoundsWon);
      setYellowTotalPoints(data.yellowTotalPoints);
      setPinkTotalPoints(data.pinkTotalPoints);
      setYellowCurrentPoints(data.yellowCurrentPoints);
      setPinkCurrentPoints(data.pinkCurrentPoints);
      setPlayerCard(data.playerCard);
      setPlayerTeam(data.players.find(p => p.username === username)?.team);
      setHasJoined(true);
    });

    newSocket.on('game-error', (data) => {
      console.log('Game error:', data.message);
      alert(`Error: ${data.message}`);
    });

    newSocket.on('initial-state', (data) => {
      console.log('Received initial state:', data);
      setGameId(data.gameId);
      setGameName(data.gameName);
      setGameState(data.gameState);
      setPlayers(data.players);
      setBoard(data.board);
      setYellowScore(data.yellowRoundsWon);
      setPinkScore(data.pinkRoundsWon);
      setYellowTotalPoints(data.yellowTotalPoints);
      setPinkTotalPoints(data.pinkTotalPoints);
      setYellowCurrentPoints(data.yellowCurrentPoints);
      setPinkCurrentPoints(data.pinkCurrentPoints);
      setPlayerCard(data.playerCard);
      setPlayerTeam(data.team);
    });

    newSocket.on('player-joined', (data) => {
      console.log('Player joined:', data.username);
      setPlayers(data.players);
      if (data.yellowRoundsWon !== undefined) setYellowScore(data.yellowRoundsWon);
      if (data.pinkRoundsWon !== undefined) setPinkScore(data.pinkRoundsWon);
      if (data.yellowTotalPoints !== undefined) setYellowTotalPoints(data.yellowTotalPoints);
      if (data.pinkTotalPoints !== undefined) setPinkTotalPoints(data.pinkTotalPoints);
      if (data.yellowCurrentPoints !== undefined) setYellowCurrentPoints(data.yellowCurrentPoints);
      if (data.pinkCurrentPoints !== undefined) setPinkCurrentPoints(data.pinkCurrentPoints);
    });

    newSocket.on('player-left', (data) => {
      console.log('Player left:', data.username);
      setPlayers(data.players);
    });

    newSocket.on('player-ready-update', (data) => {
      console.log('Player ready update:', data);
      setPlayers(data.players);
      setAllPlayersReady(data.allReady);
      if (data.yellowRoundsWon !== undefined) setYellowScore(data.yellowRoundsWon);
      if (data.pinkRoundsWon !== undefined) setPinkScore(data.pinkRoundsWon);
      if (data.yellowTotalPoints !== undefined) setYellowTotalPoints(data.yellowTotalPoints);
      if (data.pinkTotalPoints !== undefined) setPinkTotalPoints(data.pinkTotalPoints);
    });

    newSocket.on('player-disconnected', (data) => {
      console.log('Player disconnected:', data);
      alert(`${data.disconnectedPlayer} has disconnected. You win automatically!`);
      setGameState(data.gameState);
      setYellowScore(data.yellowRoundsWon);
      setPinkScore(data.pinkRoundsWon);
      setYellowTotalPoints(data.yellowTotalPoints);
      setPinkTotalPoints(data.pinkTotalPoints);
    });

    newSocket.on('game-started', (data) => {
      console.log('Game started:', data);
      setGameState(data.gameState);
      setTimeLeft(data.timeLeft);
      if (data.yellowRoundsWon !== undefined) setYellowScore(data.yellowRoundsWon);
      if (data.pinkRoundsWon !== undefined) setPinkScore(data.pinkRoundsWon);
      if (data.yellowTotalPoints !== undefined) setYellowTotalPoints(data.yellowTotalPoints);
      if (data.pinkTotalPoints !== undefined) setPinkTotalPoints(data.pinkTotalPoints);
    });

    newSocket.on('card-played', (data) => {
      console.log('Card played:', data);
      setBoard(data.board);
      setLogs(data.logs);
      if (data.yellowCurrentPoints !== undefined) setYellowCurrentPoints(data.yellowCurrentPoints);
      if (data.pinkCurrentPoints !== undefined) setPinkCurrentPoints(data.pinkCurrentPoints);
    });
    
    newSocket.on('card-discarded', (data) => {
      console.log('Card discarded:', data);
      setBoard(data.board);
      setLogs(data.logs);
      if (data.yellowCurrentPoints !== undefined) setYellowCurrentPoints(data.yellowCurrentPoints);
      if (data.pinkCurrentPoints !== undefined) setPinkCurrentPoints(data.pinkCurrentPoints);
    });

    newSocket.on('new-card', (data) => {
      console.log('New card received:', data.newCard);
      setPlayerCard(data.newCard);
    });

    newSocket.on('team-went-out', (data) => {
      console.log('Team went out:', data);
      setYellowTeamOut(data.yellowTeamOut);
      setPinkTeamOut(data.pinkTeamOut);
      setLogs(data.logs);
    });

    newSocket.on('round-ended', (data) => {
      console.log('Round ended:', data);
      setGameState(data.gameState);
      setYellowScore(data.yellowRoundsWon);
      setPinkScore(data.pinkRoundsWon);
      setYellowTotalPoints(data.yellowTotalPoints);
      setPinkTotalPoints(data.pinkTotalPoints);
      setYellowCurrentPoints(data.yellowCurrentPoints);
      setPinkCurrentPoints(data.pinkCurrentPoints);
      setYellowTeamOut(false);
      setPinkTeamOut(false);
      setPlayers(data.players);
      setIsReady(false);
      setWaitingForNextRound(true);
      
      // Store last round info for display
      setLastRoundInfo({
        winner: data.roundWinner,
        yellowPoints: data.yellowCurrentPoints,
        pinkPoints: data.pinkCurrentPoints
      });
      
      if (data.gameWinner) {
        alert(`Game Over! ${data.gameWinner.charAt(0).toUpperCase() + data.gameWinner.slice(1)} team wins!`);
      }
    });

    newSocket.on('round-started', (data) => {
      console.log('Round started:', data);
      setGameState(data.gameState);
      setBoard(data.board);
      setTimeLeft(data.timeLeft);
      setYellowTeamOut(false);
      setPinkTeamOut(false);
      setWaitingForNextRound(false);
      setIsReady(false);
      setLastRoundInfo(null);
      if (data.yellowRoundsWon !== undefined) setYellowScore(data.yellowRoundsWon);
      if (data.pinkRoundsWon !== undefined) setPinkScore(data.pinkRoundsWon);
      if (data.yellowTotalPoints !== undefined) setYellowTotalPoints(data.yellowTotalPoints);
      if (data.pinkTotalPoints !== undefined) setPinkTotalPoints(data.pinkTotalPoints);
      if (data.yellowCurrentPoints !== undefined) setYellowCurrentPoints(data.yellowCurrentPoints);
      if (data.pinkCurrentPoints !== undefined) setPinkCurrentPoints(data.pinkCurrentPoints);
    });

    newSocket.on('timer-update', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('invalid-play', (data) => {
      alert(data.message);
    });

    newSocket.on('next-round-ready-update', (data) => {
      console.log('Next round ready update:', data);
      setPlayers(data.players);
      setAllPlayersReady(data.allReady);
      if (data.yellowRoundsWon !== undefined) setYellowScore(data.yellowRoundsWon);
      if (data.pinkRoundsWon !== undefined) setPinkScore(data.pinkRoundsWon);
      if (data.yellowTotalPoints !== undefined) setYellowTotalPoints(data.yellowTotalPoints);
      if (data.pinkTotalPoints !== undefined) setPinkTotalPoints(data.pinkTotalPoints);
      
      // Update last round info if provided
      if (data.lastRoundWinner !== undefined) {
        setLastRoundInfo({
          winner: data.lastRoundWinner,
          yellowPoints: data.lastRoundYellowPoints,
          pinkPoints: data.lastRoundPinkPoints
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [username]);

  const handleCreateGame = () => {
    if (username.trim()) {
      console.log('Creating new game for user:', username);
      socket.emit('create-game', { username, gameName });
    }
  };

  const handleJoinExistingGame = (selectedGameId) => {
    if (username.trim() && selectedGameId) {
      setGameId(selectedGameId);
      setHasJoined(true);
      console.log('User joined as:', username, 'in game:', selectedGameId);
      socket.emit('join-game', { username, gameId: selectedGameId });
    }
  };

  const handleJoin = () => {
    if (username.trim() && gameId.trim()) {
      setHasJoined(true);
      console.log('User joined as:', username, 'in game:', gameId);
      socket.emit('join-game', { username, gameId });
    }
  };

  const handlePlayerReady = () => {
    setIsReady(true);
    socket.emit('player-ready');
  };

  const handlePlayCard = (targetRow, targetPosition) => {
    if (gameState === 'playing' && playerCard) {
      const targetCard = targetRow === 'yellow' ? 
        board.yellowSharedCards[targetPosition] : 
        board.pinkSharedCards[targetPosition];
      
      // Check if play is valid - matching the same conditions as canPlayCard
      if (Math.abs(playerCard.number - targetCard.number) === 1 || 
          (playerCard.number === 1 && targetCard.number === 8) || 
          (playerCard.number === 8 && targetCard.number === 1)) {
        socket.emit('play-card', { targetRow, targetPosition });
      } else {
        // Get the card element and add a visual feedback
        const cardElement = document.querySelector(`.${targetRow}-shared-${targetPosition}`);
        if (cardElement) {
          cardElement.classList.add('invalid-move');
          setTimeout(() => {
            cardElement.classList.remove('invalid-move');
          }, 1000);
        }
      }
    }
  };

  const handleTeamGoOut = () => {
    if (gameState === 'playing') {
      const confirmGoOut = window.confirm('Are you sure you want your team to go out?');
      if (confirmGoOut) {
        socket.emit('team-go-out');
      }
    }
  };
  
  const handleDiscardCard = () => {
    if (gameState === 'playing' && playerCard) {
      socket.emit('discard-card');
    }
  };

  const handleStartNextRound = () => {
    socket.emit('start-next-round');
  };

  const canPlayCard = (targetCard) => {
    return gameState === 'playing' && 
           playerCard && 
           (Math.abs(playerCard.number - targetCard.number) === 1 || 
            // Allow 1 and 8 to be played on each other
            (playerCard.number === 1 && targetCard.number === 8) || 
            (playerCard.number === 8 && targetCard.number === 1)) &&
           !((playerTeam === 'yellow' && yellowTeamOut) || (playerTeam === 'pink' && pinkTeamOut));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Login screen
  if (!hasJoined) {
    return (
      <div style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ textAlign: 'center', color: '#333' }}>Danger Danger</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px' }}>
          Connection Status: <span style={{ color: isConnected ? 'green' : 'red' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </p>

        {/* Username Input */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '16px',
              width: '250px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          />
        </div>

        {username.trim() && (
          <>
            {/* Create New Game Section */}
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>Create New Game</h3>
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="Game name (optional)"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    width: '200px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    marginRight: '10px'
                  }}
                />
                <button
                  onClick={handleCreateGame}
                  disabled={!isConnected}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: isConnected ? '#4CAF50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: isConnected ? 'pointer' : 'not-allowed'
                  }}
                >
                  Create New Game
                </button>
              </div>
            </div>

            {/* Join Existing Game Section */}
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Join Existing Game</h3>
              
              {availableGames.length > 0 ? (
                <div>
                  <p style={{ marginBottom: '15px', color: '#666' }}>Available Games:</p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {availableGames.map((game) => (
                      <div key={game.id} style={{
                        backgroundColor: 'white',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <strong>{game.name}</strong> <span style={{ color: '#666' }}>({game.id})</span>
                          <br />
                          <small style={{ color: '#888' }}>
                            {game.playerCount} player{game.playerCount !== 1 ? 's' : ''} • 
                            Rounds: Yellow {game.yellowRoundsWon} Pink {game.pinkRoundsWon} • 
                            Total Points: Yellow {game.yellowTotalPoints || 0} Pink {game.pinkTotalPoints || 0} • 
                            Status: {game.gameState}
                          </small>
                        </div>
                        <button
                          onClick={() => handleJoinExistingGame(game.id)}
                          disabled={game.playerCount >= 2}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: game.playerCount >= 2 ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: game.playerCount >= 2 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {game.playerCount >= 2 ? 'Full' : 'Join'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No active games available</p>
              )}
            </div>

            {/* Join by Game ID Section */}
            <div style={{
              backgroundColor: '#fff3e0',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#f57c00' }}>Join by Game ID</h3>
              <div>
                <input
                  type="text"
                  placeholder="Enter game ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    width: '200px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    marginRight: '10px'
                  }}
                />
                <button
                  onClick={handleJoin}
                  disabled={!gameId.trim() || !isConnected}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: (isConnected && gameId.trim()) ? '#FF9800' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: (isConnected && gameId.trim()) ? 'pointer' : 'not-allowed'
                  }}
                >
                  Join Game
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Main game interface
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Game Header */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>{gameName}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span><strong>Player:</strong> {username} ({playerTeam})</span>
          <span><strong>Game ID:</strong> {gameId}</span>
          <span><strong>Rounds Won - Yellow:</strong> {yellowScore} <strong>Pink:</strong> {pinkScore}</span>
          <span><strong>Total Points - Yellow:</strong> {yellowTotalPoints} <strong>Pink:</strong> {pinkTotalPoints}</span>
          <span><strong>Current Round Points - Yellow:</strong> {yellowCurrentPoints} <strong>Pink:</strong> {pinkCurrentPoints}</span>
          {timeLeft > 0 && <span><strong>Time:</strong> {formatTime(timeLeft)}</span>}
          {gameState === 'game-ended' && (
            <span style={{ 
              fontWeight: 'bold', 
              color: yellowScore >= 3 ? '#FFD700' : '#FF69B4',
              fontSize: '18px'
            }}>
              🏆 {yellowScore >= 3 ? 'YELLOW' : 'PINK'} TEAM WINS!
            </span>
          )}
        </div>
      </div>

      {gameState === 'waiting' && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3>Waiting for Players</h3>
          <p>Players in game: {players.length}/2</p>
          <div style={{ marginBottom: '15px' }}>
            {players.map((player, index) => (
              <span key={index} style={{
                backgroundColor: player.team === 'yellow' ? '#FFD700' : '#FF69B4',
                color: player.team === 'yellow' ? '#000' : '#fff',
                padding: '5px 10px',
                borderRadius: '15px',
                margin: '5px',
                display: 'inline-block'
              }}>
                {player.username} ({player.team}) {player.isReady ? '✓' : '○'}
              </span>
            ))}
          </div>
          {players.length >= 2 && !isReady && (
            <button
              onClick={handlePlayerReady}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Ready to Play
            </button>
          )}
          {isReady && <p style={{ color: 'green' }}>You are ready! Waiting for other players...</p>}
        </div>
      )}

      {gameState === 'round-ended' && waitingForNextRound && (
        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            color: '#9C27B0', 
            marginBottom: '20px',
            fontSize: '28px' 
          }}>
            🎯 ROUND OVER! 🎯
          </h2>
          
          {lastRoundInfo && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>Last Round Results:</h3>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '40px',
                marginBottom: '15px' 
              }}>
                <div style={{
                  backgroundColor: '#FFD700',
                  color: '#000',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  Yellow: {lastRoundInfo.yellowPoints} points
                </div>
                <div style={{
                  backgroundColor: '#FF69B4',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  Pink: {lastRoundInfo.pinkPoints} points
                </div>
              </div>
              
              {lastRoundInfo.winner !== 'tie' && (
                <h3 style={{ 
                  color: lastRoundInfo.winner === 'yellow' ? '#FFD700' : '#FF69B4',
                  fontSize: '20px' 
                }}>
                  🏆 {lastRoundInfo.winner.toUpperCase()} TEAM WINS THE ROUND! 🏆
                </h3>
              )}
              
              {lastRoundInfo.winner === 'tie' && (
                <h3 style={{ color: '#666' }}>
                  🤝 ROUND TIED! 🤝
                </h3>
              )}
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Updated Scores:</h3>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '40px',
              marginBottom: '20px' 
            }}>
              <div>
                <strong style={{ color: '#FFD700' }}>Yellow Team:</strong>
                <br />
                Rounds Won: {yellowScore}
                <br />
                Total Points: {yellowTotalPoints}
              </div>
              <div>
                <strong style={{ color: '#FF69B4' }}>Pink Team:</strong>
                <br />
                Rounds Won: {pinkScore}
                <br />
                Total Points: {pinkTotalPoints}
              </div>
            </div>
          </div>
          
          {yellowScore < 3 && pinkScore < 3 && (
            <>
              <h3>Waiting for Next Round</h3>
              <p>Both players must be ready to start the next round</p>
              <div style={{ marginBottom: '20px' }}>
                {players.map((player, index) => (
                  <span key={index} style={{
                    backgroundColor: player.team === 'yellow' ? '#FFD700' : '#FF69B4',
                    color: player.team === 'yellow' ? '#000' : '#fff',
                    padding: '8px 15px',
                    borderRadius: '20px',
                    margin: '5px',
                    display: 'inline-block',
                    fontSize: '14px'
                  }}>
                    {player.username} ({player.team}) {player.isReady ? '✅' : '⏳'}
                  </span>
                ))}
              </div>
              
              {!isReady && (
                <button
                  onClick={() => {
                    setIsReady(true);
                    handleStartNextRound();
                  }}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🚀 Ready for Next Round!
                </button>
              )}
              
              {isReady && !allPlayersReady && (
                <p style={{ 
                  color: '#9C27B0', 
                  fontWeight: 'bold',
                  fontSize: '16px' 
                }}>
                  ✅ You are ready! Waiting for other player...
                </p>
              )}
            </>
          )}
          
          {(yellowScore >= 3 || pinkScore >= 3) && (
            <div>
              <h2 style={{ 
                color: yellowScore >= 3 ? '#FFD700' : '#FF69B4',
                fontSize: '32px',
                marginBottom: '20px' 
              }}>
                🎉 {yellowScore >= 3 ? 'YELLOW' : 'PINK'} TEAM WINS THE GAME! 🎉
              </h2>
              <div style={{ 
                fontSize: '18px',
                color: '#666' 
              }}>
                Final Score: Yellow {yellowScore} - {pinkScore} Pink
                <br />
                Total Points: Yellow {yellowTotalPoints} - {pinkTotalPoints} Pink
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show final board state after round ends */}
      {gameState === 'round-ended' && waitingForNextRound && (
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#2e7d32' }}>
            Final Board State 
          </h3>
          
          {/* Row 1 - Yellow Player's Card */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <div style={{
              width: '80px',
              height: '100px',
              backgroundColor: '#FFD700',
              border: '2px solid #333',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <div style={{ fontSize: '18px' }}>{board.yellowPlayerCard.number}</div>
              <div style={{ fontSize: '10px' }}>value: {board.yellowPlayerCard.value}</div>
            </div>
          </div>

          {/* Row 2 - Yellow Shared Cards and Discard Pile */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '10px'
          }}>
            <div style={{
              width: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginLeft: '20px'
            }}>
              <div style={{ 
                fontWeight: 'bold',
                marginBottom: '5px'
              }}>Yellow Discards</div>
              <div style={{
                width: '100px',
                minHeight: '100px',
                border: '1px dashed #FFD700',
                borderRadius: '8px',
                padding: '5px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2px',
                justifyContent: 'center'
              }}>
                {board.yellowDiscardPile && board.yellowDiscardPile.map((card, index) => (
                  <div
                    key={`yellow-discard-${index}`}
                    style={{
                      width: '30px',
                      height: '40px',
                      backgroundColor: '#FFD700',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      margin: '2px'
                    }}
                  >
                    <div>{card.number}</div>
                    <div style={{ fontSize: '8px' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px',
              flex: 1
            }}>
              {board.yellowSharedCards.map((card, index) => (
                <div
                  key={`yellow-final-${index}`}
                  style={{
                    width: '80px',
                    height: '100px',
                    backgroundColor: card.team === 'yellow' ? '#FFD700' : '#FF69B4',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: card.team === 'yellow' ? '#000' : '#fff'
                  }}
                >
                  <div style={{ fontSize: '18px' }}>{card.number}</div>
                  <div style={{ fontSize: '10px' }}>value: {card.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3 - Pink Shared Cards */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px',
            marginBottom: '10px'
          }}>
            {board.pinkSharedCards.map((card, index) => (
              <div
                key={`pink-final-${index}`}
                style={{
                  width: '80px',
                  height: '100px',
                  backgroundColor: card.team === 'pink' ? '#FF69B4' : '#FFD700',
                  border: '2px solid #333',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: card.team === 'pink' ? '#fff' : '#000'
                }}
              >
                <div style={{ fontSize: '18px' }}>{card.number}</div>
                <div style={{ fontSize: '10px' }}>value: {card.value}</div>
              </div>
            ))}
          </div>

          {/* Row 4 - Pink Player's Card with Discard Pile */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '100px',
              backgroundColor: '#FF69B4',
              border: '2px solid #333',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff',
              margin: 'auto'
            }}>
              <div style={{ fontSize: '18px' }}>{board.pinkPlayerCard.number}</div>
              <div style={{ fontSize: '10px' }}>value: {board.pinkPlayerCard.value}</div>
            </div>
            
            {/* Pink Discard Pile */}
            <div style={{
              width: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginRight: '20px'
            }}>
              <div style={{ 
                fontWeight: 'bold',
                marginBottom: '5px'
              }}>Pink Discards</div>
              <div style={{
                width: '100px',
                minHeight: '100px',
                border: '1px dashed #FF69B4',
                borderRadius: '8px',
                padding: '5px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2px',
                justifyContent: 'center'
              }}>
                {board.pinkDiscardPile && board.pinkDiscardPile.map((card, index) => (
                  <div
                    key={`pink-discard-${index}`}
                    style={{
                      width: '30px',
                      height: '40px',
                      backgroundColor: '#FF69B4',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      margin: '2px'
                    }}
                  >
                    <div>{card.number}</div>
                    <div style={{ fontSize: '8px' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(gameState === 'playing' || (gameState === 'round-ended' && !waitingForNextRound)) && (
        <>
          {/* Game Board */}
          <div style={{
            backgroundColor: '#e8f5e8',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Game Board</h3>
            
            {/* Row 1 - Yellow Player's Hidden Card with Discard Pile on side */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'flex-start',
              marginBottom: '10px'
            }}>
              {/* Main player card section */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '280px', /* Width to match three 80px cards with 20px spaces */
                opacity: playerTeam === 'yellow' ? 1 : 0.3
              }}>
                <div style={{
                  width: '80px',
                  height: '100px',
                  backgroundColor: playerTeam === 'yellow' ? '#FFD700' : '#ddd',
                  border: '2px solid #333',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {playerTeam === 'yellow' && playerCard ? (
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{playerCard.number}</div>
                      <div style={{ fontSize: '10px' }}>value: {playerCard.value}</div>
                    </div>
                  ) : '?'}
                </div>
                
                {playerTeam === 'yellow' && gameState === 'playing' && playerCard && (
                  <button
                    onClick={handleDiscardCard}
                    style={{
                      marginLeft: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Discard
                  </button>
                )}
              </div>
              
              {/* Yellow discard pile on side */}
              <div style={{
                width: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginLeft: '20px'
              }}>
                <div style={{ 
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}>Yellow Discards</div>
                <div style={{
                  width: '100px',
                  minHeight: '100px',
                  border: '1px dashed #FFD700',
                  borderRadius: '8px',
                  padding: '5px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  justifyContent: 'center'
                }}>
                  {board.yellowDiscardPile && board.yellowDiscardPile.map((card, index) => (
                    <div
                      key={`yellow-discard-${index}`}
                      style={{
                        width: '30px',
                        height: '40px',
                        backgroundColor: '#FFD700',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        margin: '2px'
                      }}
                    >
                      <div>{card.number}</div>
                      <div style={{ fontSize: '8px' }}>{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2 - Yellow Shared Cards */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '10px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '10px',
                width: '100%'
              }}>
                {board.yellowSharedCards.map((card, index) => (
                  <div
                    key={`yellow-final-${index}`}
                    className={`yellow-shared-${index}`}
                    onClick={() => handlePlayCard('yellow', index)}
                    style={{
                      width: '80px',
                      height: '100px',
                      backgroundColor: card.team === 'yellow' ? 
                        (canPlayCard(card) ? '#FFE135' : '#FFD700') : 
                        (canPlayCard(card) ? '#FFB3DA' : '#FF69B4'),
                      border: canPlayCard(card) ? '3px solid #4CAF50' : '2px solid #333',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: canPlayCard(card) ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '18px' }}>{card.number}</div>
                    <div style={{ fontSize: '10px' }}>value: {card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 3 - Pink Shared Cards */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '10px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '10px',
                width: '100%'
              }}>
                {board.pinkSharedCards.map((card, index) => (
                  <div
                    key={`pink-${index}`}
                    className={`pink-shared-${index}`}
                    onClick={() => handlePlayCard('pink', index)}
                    style={{
                      width: '80px',
                      height: '100px',
                      backgroundColor: card.team === 'pink' ? 
                        (canPlayCard(card) ? '#FFB3DA' : '#FF69B4') : 
                        (canPlayCard(card) ? '#FFE135' : '#FFD700'),
                      border: canPlayCard(card) ? '3px solid #4CAF50' : '2px solid #333',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: canPlayCard(card) ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '18px' }}>{card.number}</div>
                    <div style={{ fontSize: '10px' }}>value: {card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 4 - Pink Player's Hidden Card with Discard Pile on side */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              {/* Pink discard pile on side */}
              <div style={{
                width: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginRight: '20px'
              }}>
                <div style={{ 
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}>Pink Discards</div>
                <div style={{
                  width: '100px',
                  minHeight: '100px',
                  border: '1px dashed #FF69B4',
                  borderRadius: '8px',
                  padding: '5px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  justifyContent: 'center'
                }}>
                  {board.pinkDiscardPile && board.pinkDiscardPile.map((card, index) => (
                    <div
                      key={`pink-discard-${index}`}
                      style={{
                        width: '30px',
                        height: '40px',
                        backgroundColor: '#FF69B4',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        margin: '2px'
                      }}
                    >
                      <div>{card.number}</div>
                      <div style={{ fontSize: '8px' }}>{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Main player card section */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '280px', /* Width to match three 80px cards with 20px spaces */
                opacity: playerTeam === 'pink' ? 1 : 0.3
              }}>
                <div style={{
                  width: '80px',
                  height: '100px',
                  backgroundColor: playerTeam === 'pink' ? '#FF69B4' : '#ddd',
                  border: '2px solid #333',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {playerTeam === 'pink' && playerCard ? (
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{playerCard.number}</div>
                      <div style={{ fontSize: '10px' }}>value: {playerCard.value}</div>
                    </div>
                  ) : '?'}
                </div>
                
                {playerTeam === 'pink' && gameState === 'playing' && playerCard && (
                  <button
                    onClick={handleDiscardCard}
                    style={{
                      marginLeft: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Your Card and Actions */}
          {gameState === 'playing' && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3>Your Card: {playerCard ? `${playerCard.number} (value: ${playerCard.value})` : 'None'}</h3>
              <p>Play on any visible card that is +1 or -1 from your card value</p>
              
              {!((playerTeam === 'yellow' && yellowTeamOut) || (playerTeam === 'pink' && pinkTeamOut)) && (
                <button
                  onClick={handleTeamGoOut}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  Go Out (Lock Current Score)
                </button>
              )}
              
              {((playerTeam === 'yellow' && yellowTeamOut) || (playerTeam === 'pink' && pinkTeamOut)) && (
                <p style={{ color: '#FF9800', fontWeight: 'bold' }}>Your team has gone out!</p>
              )}
            </div>
          )}

          {/* Team Status */}
          <div style={{
            backgroundColor: '#fff3e0',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h3>Team Status</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <strong style={{ color: '#FFD700' }}>Yellow Team:</strong>
                {yellowTeamOut ? ' OUT' : ' Playing'}
              </div>
              <div>
                <strong style={{ color: '#FF69B4' }}>Pink Team:</strong>
                {pinkTeamOut ? ' OUT' : ' Playing'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Activity Log */}
      {/* <div>
        <h3>Activity Log</h3>
        <div style={{
          backgroundColor: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '5px', 
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '10px'
        }}>
          {logs.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No activity yet...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={{
                padding: '5px',
                borderBottom: '1px solid #ffe0b2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px'
              }}>
                <span>
                  <strong style={{ color: log.team === 'yellow' ? '#FFD700' : '#FF69B4' }}>
                    {log.username}
                  </strong> {log.action}
                </span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {log.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      </div> */}
    </div>
  );
}

export default CounterApp;

