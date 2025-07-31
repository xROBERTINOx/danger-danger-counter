import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

function CounterApp() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const [logs, setLogs] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    console.log('Connecting to server...');

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('initial-state', (gameState) => {
      console.log('Received initial state:', gameState);
      setCounter(gameState.counter);
      setLogs(gameState.logs);
    });

    newSocket.on('counter-updated', (gameState) => {
      console.log('Received counter update:', gameState);
      setCounter(gameState.counter);
      setLogs(gameState.logs);
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
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      setHasJoined(true);
      console.log('User joined as:', username);
    }
  };

  const handleIncrement = () => {
    if (socket && username) {
      console.log('Sending increment request for user:', username);
      socket.emit('increment-counter', { username });
    }
  };

  // Login screen
  if (!hasJoined) {
    return (
      <div style={{
        padding: '50px',
        textAlign: 'center',
        maxWidth: '400px',
        margin: '0 auto',
        fontFamily: 'Ariel, sans-serif'
      }}>
        <h1>Counter App</h1>
        <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>

        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            width: '200px',
            marginRight: '10px',
            border: '2px solid #ddd',
            borderRadius: '5px',
          }}
        />

        <button
          onClick={handleJoin}
          disabled={!username.trim() || !isConnected}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isConnected ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isConnected ? 'pointer' : 'not-allowed'
          }}
        >
          Join
        </button>
      </div>
    );
  }

  // Main counter interface
    return (
    <>
      <div style={{
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p><strong>Username:</strong> {username}</p>
        <p><strong>Connection:</strong> {isConnected ? 'Connected' : 'Disconnected'} </p>
        <p><strong>Socket ID:</strong> {socket?.id}</p>
      </div>

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '30px',
        borderRadius: '10px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>

        <h2>Current Counter: <span style={{ fontSize: '2em', color: '#1976d2' }}>{counter}</span></h2>

        <button
          onClick={handleIncrement}
          disabled={!isConnected}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: isConnected ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            marginTop: '10px'
          }}
        >
          Add +1
        </button>
      </div>

      <div>
        <h3> Activity Log</h3>
        <div style={{
          backgroundColor: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '5px', 
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '10px'
        }}>
          {logs.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No activity yet...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={{
                padding: '8px',
                borderBotom: '1px solid #ffe0b2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  <strong>{log.username}</strong> {log.action} =&gt; Total: <strong>{log.newTotal}</strong>
                </span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {log.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default CounterApp;

