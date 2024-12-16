// Configuration d’un backend Node.js pour accepter un Webhook QuickNode sur Railway

import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'ws';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Création du serveur HTTP
const server = app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});

// Configuration du serveur WebSocket
const wss = new Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client WebSocket connecté.');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client WebSocket déconnecté.');
  });
});

// Endpoint pour recevoir les Webhooks de QuickNode
app.post('/webhook', (req, res) => {
  try {
    const event = req.body;
    console.log('Webhook reçu :', event);

    // Diffuser l’événement à tous les clients WebSocket connectés
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(event));
      }
    });

    res.status(200).send('Webhook reçu avec succès');
  } catch (error) {
    console.error('Erreur dans le traitement du Webhook :', error);
    res.status(500).send('Erreur serveur');
  }
});

// Endpoint de vérification de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
  console.error('Erreur du serveur :', error);
});

server.on('close', () => {
  console.log('Le serveur a été fermé.');
});
