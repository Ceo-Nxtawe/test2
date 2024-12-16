require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configurer votre clé API QuickNode et URL QuickStreams
const QUICKNODE_API_KEY = process.env.QUICKNODE_API_KEY; // Définissez dans votre fichier .env
const QUICKNODE_URL = `https://your-endpoint-name.quicknode.com/quickstreams/v1/streams`;

// 1. Route pour créer un stream
app.post('/create-stream', async (req, res) => {
  const { blockchain, network, address, webhookUrl } = req.body;

  try {
    const response = await axios.post(
      QUICKNODE_URL,
      {
        blockchain,
        network,
        filters: { address }, // Ajoutez des filtres comme l'adresse d'un smart contract
        webhook_url: webhookUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${QUICKNODE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      message: 'Stream créé avec succès !',
      stream: response.data,
    });
  } catch (error) {
    console.error('Erreur lors de la création du stream :', error.response.data);
    res.status(500).json({ error: 'Impossible de créer le stream' });
  }
});

// 2. Route pour gérer les webhooks (réception des événements)
app.post('/webhook', (req, res) => {
  const event = req.body;

  console.log('Événement reçu :', JSON.stringify(event, null, 2));

  // Exemple : Traiter une transaction
  if (event.type === 'transaction') {
    console.log(`Transaction détectée : 
      De: ${event.from}
      À: ${event.to}
      Montant: ${event.value}`);
  }

  res.sendStatus(200); // Accuser réception de l'événement
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});

