import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration des URLs RPC et WebSocket
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_WS = process.env.SOLANA_WS_URL || 'wss://shy-boldest-model.solana-mainnet.quiknode.pro/a39977485f024e18a2d2a167161ab8a8e0e99ab5';
const TOKEN_MINT = process.env.TOKEN_MINT_ADDRESS || 'BvSUmSmTR4T9F7pd2LdDKMvz9XiE2Z9tbkJaggVypump';

export class TokenMonitor {
  constructor() {
    this.connection = new Connection(SOLANA_RPC, {
      commitment: 'confirmed',
      wsEndpoint: SOLANA_WS,
    });
    this.mintAddress = new PublicKey(TOKEN_MINT);
    this.listeners = new Set();
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
      console.log(`Monitoring started for token: ${this.mintAddress.toBase58()}`);
      console.log(`Using WebSocket endpoint: ${SOLANA_WS}`);

      this.subscriptionId = this.connection.onLogs(
        this.mintAddress,
        async (logs) => {
          console.log('Logs received:', logs);

          if (!logs || !logs.signature) {
            console.warn('Invalid logs: Missing signature', logs);
            return;
          }

          try {
            // Récupérer la transaction avec support des versions
            const transaction = await this.connection.getTransaction(logs.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });

            if (!transaction) {
              console.warn(`Transaction not found for signature: ${logs.signature}`);
              return;
            }

            console.log('Transaction details:', transaction);

            // Diffuser l'événement aux abonnés
            for (const listener of this.listeners) {
              listener(transaction);
            }
          } catch (error) {
            if (error.message.includes('Transaction version')) {
              console.warn(`Skipping unsupported transaction version: ${logs.signature}`);
            } else {
              console.error('Error processing transaction:', error);
            }
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
      console.log('Monitoring stopped.');
    }
  }
}

