import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Stockage des clients WebSocket connectés
const clients = new Set();

// Gestion des connexions WebSocket
wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');
  clients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Endpoint pour les Webhooks QuickNode
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);

  try {
    // Diffuser les données à tous les clients WebSocket
    const event = req.body;
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(event));
      }
    });

    console.log('Event broadcasted to WebSocket clients.');
    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Server error.');
  }
});

// Endpoint de vérification de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Gestion des erreurs serveur
server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('close', () => {
  console.log('Server has been stopped.');
});

// Lancer le serveur
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

