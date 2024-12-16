// Configuration d'un backend Node.js pour accepter un Webhook QuickNode sur Railway

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

const clients = new Set();

// Gestion des connexions WebSocket
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
    console.log('Requête Webhook reçue. Corps de la requête :', req.body);

    const event = req.body;

    // Diffuser les événements reçus à tous les clients WebSocket
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(event));
      }
    });

    console.log('Événement diffusé aux clients WebSocket.');
    res.status(200).send('Webhook traité avec succès.');
  } catch (error) {
    console.error('Erreur dans le traitement du Webhook :', error);
    res.status(500).send('Erreur serveur.');
  }
});

// Endpoint de vérification de santé
app.get('/health', (req, res) => {
  console.log('Requête de santé reçue.');
  res.json({ status: 'healthy' });
});

// Lancer le serveur HTTP avec WebSocket
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});

