import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws'; // Import correct pour WebSocketServer
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app); // Serveur HTTP sur lequel le WebSocket va s'attacher
const wss = new WebSocketServer({ server }); // Création du WebSocketServer avec HTTP

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Gestion des connexions WebSocket
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client WebSocket connecté.');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client WebSocket déconnecté.');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('Erreur WebSocket :', error);
  });
});

// Endpoint pour recevoir les Webhooks de QuickNode
app.post('/webhook', (req, res) => {
  try {
    const event = req.body;
    console.log('Webhook reçu :', event);

    // Diffuser les événements reçus à tous les clients WebSocket
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(event));
      }
    });

    res.status(200).send('Webhook traité avec succès.');
  } catch (error) {
    console.error('Erreur dans le traitement du Webhook :', error);
    res.status(500).send('Erreur serveur.');
  }
});

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Lancer le serveur HTTP avec WebSocket
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});

