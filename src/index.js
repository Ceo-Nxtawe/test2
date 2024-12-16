import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Clients WebSocket
const clients = new Set();

// Gérer les connexions WebSocket
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client WebSocket connecté.');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client WebSocket déconnecté.');
  });
});

// Endpoint pour les Webhooks QuickNode
app.post('/webhook', (req, res) => {
  const event = req.body;
  console.log('Webhook reçu :', event);

  // Diffuser les données reçues à tous les clients WebSocket connectés
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });

  res.status(200).send('Webhook reçu avec succès');
});

// Endpoint de vérification de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Lancer le serveur
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
