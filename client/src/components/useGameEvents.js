// Game actions and event handling
import { useEffect } from 'react';

export const useGameEvents = (socket, setters) => {
  const {
    setGameId,
    setGameName,
    setGameState,
    setPlayers,
    setPlayerCard,
    setPlayerTeam,
    setBoard,
    setYellowScore,
    setPinkScore,
    setYellowTotalPoints,
    setPinkTotalPoints,
    setYellowCurrentPoints,
    setPinkCurrentPoints,
    setTimeLeft,
    setLogs,
    setYellowTeamOut,
    setPinkTeamOut,
    setHasJoined,
    setAllPlayersReady,
    setWaitingForNextRound,
    setLastRoundInfo
  } = setters;

  useEffect(() => {
    if (!socket) return;

    socket.on('game-created', (data) => {
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
      setPlayerTeam(data.players.find(p => p.id === socket.id)?.team);
      setHasJoined(true);
    });

    socket.on('game-error', (data) => {
      console.log('Game error:', data.message);
      alert(`Error: ${data.message}`);
    });

    socket.on('initial-state', (data) => {
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
      setPlayerTeam(data.players.find(p => p.id === socket.id)?.team);
      setHasJoined(true);
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      setPlayers(data.players);
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data);
      setPlayers(data.players);
    });

    socket.on('player-ready-update', (data) => {
      console.log('Player ready update:', data);
      setPlayers(prev => 
        prev.map(p => p.id === data.playerId ? { ...p, isReady: data.isReady } : p)
      );
      setAllPlayersReady(data.allPlayersReady);
    });

    socket.on('round-started', (data) => {
      console.log('Round started:', data);
      setGameState('playing');
      setBoard(data.board);
      setTimeLeft(data.timeLeft);
      setWaitingForNextRound(false);
      setAllPlayersReady(false);
      setYellowTeamOut(false);
      setPinkTeamOut(false);
      
      // Reset player ready status
      setPlayers(prev =>
        prev.map(p => ({ ...p, isReady: false }))
      );
    });

    socket.on('time-update', (data) => {
      setTimeLeft(data.timeLeft);
    });

    socket.on('team-out-update', (data) => {
      setYellowTeamOut(data.yellowTeamOut);
      setPinkTeamOut(data.pinkTeamOut);
    });

    socket.on('board-updated', (data) => {
      setBoard(data.board);
    });

    socket.on('round-ended', (data) => {
      console.log('Round ended:', data);
      setGameState('round-ended');
      setYellowScore(data.yellowRounds);
      setPinkScore(data.pinkRounds);
      setYellowTotalPoints(data.yellowTotal);
      setPinkTotalPoints(data.pinkTotal);
      setWaitingForNextRound(true);
      setLastRoundInfo({
        yellowScore: data.yellowScore,
        pinkScore: data.pinkScore,
        winner: data.winner,
        round: data.round,
        maxRounds: data.maxRounds
      });
    });

    socket.on('game-ended', (data) => {
      console.log('Game ended:', data);
      setGameState('game-ended');
      setYellowScore(data.yellowScore);
      setPinkScore(data.pinkScore);
      setYellowTotalPoints(data.yellowTotal);
      setPinkTotalPoints(data.pinkTotal);
      setLastRoundInfo({
        yellowScore: data.yellowTotal,
        pinkScore: data.pinkTotal,
        winner: data.winner
      });
    });

    socket.on('log-update', (data) => {
      console.log('Log update:', data);
      setLogs(data.logs);
    });
    
    return () => {
      socket.off('game-created');
      socket.off('game-error');
      socket.off('initial-state');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-ready-update');
      socket.off('round-started');
      socket.off('time-update');
      socket.off('team-out-update');
      socket.off('board-updated');
      socket.off('round-ended');
      socket.off('game-ended');
      socket.off('log-update');
    };
  }, [socket, setters]);

  // Mark player as ready
  const setPlayerReady = (isReady) => {
    if (socket) {
      socket.emit('player-ready', { ready: isReady });
    }
  };

  // Swap cards
  const swapCards = (fromPosition, toPosition) => {
    if (socket) {
      socket.emit('swap-cards', { from: fromPosition, to: toPosition });
    }
  };

  // Call team out
  const callTeamOut = () => {
    if (socket) {
      socket.emit('team-out');
    }
  };

  return {
    setPlayerReady,
    swapCards,
    callTeamOut
  };
};

export default useGameEvents;
