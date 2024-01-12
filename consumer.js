// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const http = require('http'); // Add this line
const socketIo = require('socket.io'); // Add this line

const app = express();
const server = http.createServer(app); // Replace 'app.listen' with 'server.listen'
const io = socketIo(server); // Add this line

app.use(bodyParser.json());
app.use(cors());

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

app.post('/messages', async (req, res) => {
  try {
    const { message } = req.body;
    await producer.send({
      topic: 'messages',
      messages: [{ value: JSON.stringify({ user: 'user1', text: message }) }],
    });

    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('chatdb');
    await db.collection('messages').insertOne({ user: 'user1', text: message });

    io.emit('message', { user: 'user1', text: message }); // Emit the message to connected clients

    res.sendStatus(200);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/messages', async (req, res) => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('chatdb');
    const messages = await db.collection('messages').find().toArray();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Internal Server Error');
  }
});

const consumer = kafka.consumer({ groupId: 'my-group' });

const run = async () => {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'messages', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const msg = JSON.parse(message.value.toString());
      console.log(`Received message: ${msg.text} from ${msg.user}`);
      io.emit('message', msg); // Emit the message to connected clients
    },
  });
};

run().catch(console.error);

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
