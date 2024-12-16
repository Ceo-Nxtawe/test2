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
const QUICKNODE_API_KEY = process.env.QUICKNODE_API_KEY;

if (!QUICKNODE_API_KEY) {
  console.error('Erreur : QUICKNODE_API_KEY est manquant dans les variables d'environnement.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Stockage des clients WebSocket connectés
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

// Endpoint pour les Webhooks QuickNode
app.post('/webhook', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || authHeader !== `Bearer ${QUICKNODE_API_KEY}`) {
    console.error('Token d'authentification manquant ou invalide.');
    return res.status(401).send('Unauthorized');
  }

  try {
    console.log('Webhook reçu avec un token valide. Corps :', req.body);

    // Diffuser les données aux clients WebSocket
    const event = req.body;
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

// Endpoint de vérification de santé
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'healthy' });
});

// Lancer le serveur
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
