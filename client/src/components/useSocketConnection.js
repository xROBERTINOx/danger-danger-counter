// Socket connection management
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useSocketConnection = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [availableGames, setAvailableGames] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    // Use the current host's hostname/IP but with server port
    const serverUrl = `http://${window.location.hostname}:3001`;
    console.log('Connecting to server at:', serverUrl);
    const newSocket = io(serverUrl);
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

    return () => {
      // Cleanup on unmount
      newSocket.disconnect();
    };
  }, []);
  
  // Get available games
  const refreshGamesList = () => {
    if (socket) {
      socket.emit('get-games');
    }
  };

  // Create a new game
  const createGame = (username, gameName) => {
    if (socket) {
      socket.emit('create-game', { username, gameName });
    }
  };

  // Join an existing game
  const joinGame = (username, gameId) => {
    if (socket) {
      socket.emit('join-game', { username, gameId });
    }
  };

  return {
    socket,
    isConnected,
    availableGames,
    refreshGamesList,
    createGame,
    joinGame
  };
};

export default useSocketConnection;
