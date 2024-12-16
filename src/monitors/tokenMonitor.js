import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

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
      console.log(`Monitoring started with WebSocket endpoint: ${SOLANA_WS}`);
      console.log(`Token Mint Address: ${this.mintAddress.toBase58()}`);
      this.subscriptionId = this.connection.onLogs(
        this.mintAddress,
        async (logs) => {
          console.log('Logs received:', logs);

          if (!logs || !logs.signature) {
            console.error('Invalid logs: Missing signature', logs);
            return;
          }

          try {
            const transaction = await this.connection.getParsedTransaction(logs.signature, {
              commitment: 'confirmed',
            });

            if (!transaction) {
              console.warn(`Transaction not found for signature: ${logs.signature}`);
              return;
            }

            console.log('Parsed transaction details:', transaction);

            // Extraire le prix en SOL depuis la transaction
            const priceInSOL = this.extractPriceFromTransaction(transaction);
            if (priceInSOL) {
              console.log(`Price detected: ${priceInSOL} SOL`);
            }

            for (const listener of this.listeners) {
              listener({ transaction, priceInSOL });
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
      console.log('Monitoring stopped.');
    }
  }

  extractPriceFromTransaction(transaction) {
    try {
      const instructions = transaction.transaction.message.instructions;
      let solTransfer = null;
      let tokenTransfer = null;

      // Parcourir les instructions pour trouver les transferts
      for (const instruction of instructions) {
        if (instruction.programId.toBase58() === '11111111111111111111111111111111') {
          // Transfert de SOL
          const parsed = instruction.parsed;
          if (parsed && parsed.info && parsed.info.lamports) {
            solTransfer = parsed.info.lamports / 1e9; // Convertir lamports en SOL
          }
        } else if (instruction.programId.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          // Transfert de token SPL
          const parsed = instruction.parsed;
          if (parsed && parsed.info && parsed.info.tokenAmount) {
            tokenTransfer = parsed.info.tokenAmount.uiAmount;
          }
        }
      }

      // Si on trouve un transfert SOL et un transfert de token, calculer le prix
      if (solTransfer && tokenTransfer) {
        return solTransfer / tokenTransfer;
      }

      return null;
    } catch (error) {
      console.error('Error extracting price:', error);
      return null;
    }
  }
}

