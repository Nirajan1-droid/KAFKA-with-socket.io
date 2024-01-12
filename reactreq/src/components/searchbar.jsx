// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Paper, Typography } from '@material-ui/core';
import io from 'socket.io-client'; // Add this line

const socket = io('http://localhost:3001'); // Add this line

const App = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Fetch messages from backend (Kafka consumer)
    const fetchMessages = async () => {
      try {
        const response = await fetch('http://localhost:3001/messages');
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          console.error('Failed to fetch messages.');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Connect to the WebSocket server when the component mounts
    socket.connect();

    // Listen for incoming messages from the server
    socket.on('message', (message) => {
      console.log('Received message:', message);
      // Update state or perform other actions with the received message
      setMessages([...messages, message]);
    });

    fetchMessages();

    // Clean up the socket connection when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [messages]);

  const handleMessageSend = async () => {
    // Send message to backend (Kafka producer)
    try {
      await fetch('http://localhost:3001/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div>
      <Paper elevation={3} style={{ padding: '20px', margin: '20px', maxWidth: '400px' }}>
        <Typography variant="h5">User1</Typography>
        <div>
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.user}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <TextField
          label="Message"
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleMessageSend}>
          Send
        </Button>
      </Paper>
    </div>
  );
};

export default App;
