import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { TokenMonitor } from './monitors/tokenMonitor.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize token monitor
const tokenMonitor = new TokenMonitor();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');

  const unsubscribe = tokenMonitor.subscribe((event) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    unsubscribe();
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});