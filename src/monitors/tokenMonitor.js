import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://shy-boldest-model.solana-mainnet.quiknode.pro/a39977485f024e18a2d2a167161ab8a8e0e99ab5';
const TOKEN_MINT = process.env.TOKEN_MINT_ADDRESS || 'v8kp27iQox1vsuo7wCuPiYGh3ZFQDAy8hB4qwn5Abpump';

export class TokenMonitor {
  constructor() {
    this.connection = new Connection(SOLANA_RPC, {
      commitment: 'confirmed',
      wsEndpoint: SOLANA_RPC.replace('https://', 'wss://')
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
      this.subscriptionId = this.connection.onLogs(
        this.mintAddress,
        async (logs, context) => {
          try {
            const tx = await this.connection.getTransaction(context.signature);
            if (!tx) return;

            const event = {
              signature: context.signature,
              timestamp: new Date(),
              type: this.parseTransactionType(tx),
              amount: 0 // You would parse the actual amount here
            };

            this.listeners.forEach(listener => listener(event));
          } catch (error) {
            console.error('Error processing transaction:', error);
          }
        },
        'confirmed'
      );
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  }

  stopMonitoring() {
    if (this.subscriptionId) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }

  parseTransactionType(tx) {
    // Simplified transaction type parsing
    // You would implement more sophisticated parsing based on your needs
    return 'mint';
  }
}
