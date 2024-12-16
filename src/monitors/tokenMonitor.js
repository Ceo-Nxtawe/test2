import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de l'adresse RPC et du WebSocket
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_WS = process.env.SOLANA_WS_URL || 'wss://shy-boldest-model.solana-mainnet.quiknode.pro/a39977485f024e18a2d2a167161ab8a8e0e99ab5';
const TOKEN_MINT = process.env.TOKEN_MINT_ADDRESS || 'BvSUmSmTR4T9F7pd2LdDKMvz9XiE2Z9tbkJaggVypump';

export class TokenMonitor {
  constructor() {
    this.connection = new Connection(SOLANA_RPC, {
      commitment: 'confirmed',
      wsEndpoint: SOLANA_WS, // WebSocket pour les logs en temps réel
    });
    this.mintAddress = new PublicKey(TOKEN_MINT); // Adresse de mint
    this.listeners = new Set(); // Gestion des abonnements
  }

  subscribe(callback) {
    this.listeners.add(callback);

    if (this.listeners.size === 1) {
      this.startMonitoring();
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopMonitoring();
      }
    };
  }

  async startMonitoring() {
    try {
      console.log(`Starting monitoring for token: ${this.mintAddress.toBase58()}`);
      console.log(`Using WebSocket endpoint: ${SOLANA_WS}`);
      this.subscriptionId = this.connection.onLogs(
        this.mintAddress,
        async (logs, context) => {
          console.log('Logs received:', logs);

          if (!logs || !logs.signature) {
            console.error('Invalid logs: Missing signature', logs);
            return;
          }

          try {
            const transaction = await this.connection.getTransaction(logs.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0, // Support des transactions versionnées
            });

            if (!transaction) {
              console.warn(`Transaction not found for signature: ${logs.signature}`);
              return;
            }

            console.log('Transaction details:', transaction);

            // Diffuser l'événement aux abonnés
            for (const listener of this.listeners) {
              listener(this.processTransaction(transaction));
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  }

  stopMonitoring() {
    if (this.subscriptionId) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      console.log('Stopped monitoring.');
    }
  }

  processTransaction(transaction) {
    // Analyse basique des instructions de la transaction
    try {
      const message = transaction.transaction.message;
      const instructions = message.instructions;

      const parsedInstructions = instructions.map((instruction, index) => {
        const parsed = this.parseInstruction(instruction);
        if (parsed) {
          console.log(`[Instruction ${index}] Type: ${parsed.type}, Details:`, parsed.details);
        } else {
          console.log(`[Instruction ${index}] Unable to parse`);
        }
        return parsed;
      });

      return parsedInstructions;
    } catch (error) {
      console.error('Error processing transaction:', error);
      return null;
    }
  }

  parseInstruction(instruction) {
    try {
      const { programId, data } = instruction;

      // Exemple d'analyse : détection des transferts SPL Token
      if (programId.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        const details = {
          programId: programId.toBase58(),
          data: data ? data.toString('hex') : null, // Convertir les données brutes en hexadécimal
        };

        // Simplification : détection de "buy" ou "sell"
        if (data.includes('Transfer')) {
          return { type: 'transfer', details };
        } else if (data.includes('InitializeAccount3')) {
          return { type: 'initialize', details };
        } else {
          return { type: 'unknown', details };
        }
      }
    } catch (error) {
      console.error('Error parsing instruction:', error);
    }
    return null;
  }
}
