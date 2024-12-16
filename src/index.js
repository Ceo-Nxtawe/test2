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
          if (!logs || !logs.signature) {
            console.warn('Invalid logs: Missing signature.');
            return;
          }

          try {
            const transaction = await this.connection.getParsedTransaction(logs.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0, // Support des transactions versionnées
            });

            if (!transaction) {
              console.debug(`Transaction not found: ${logs.signature}`);
              return;
            }

            console.debug('Transaction details:', JSON.stringify(transaction, null, 2));

            // Extraire uniquement les transactions "buy" ou "sell"
            const buyOrSell = this.extractBuyAndSellFromTransaction(transaction);
            if (buyOrSell) {
              console.log(
                `${buyOrSell.type === 'buy' ? '💰 BUY' : '🔻 SELL'}: ${
                  buyOrSell.tokenTransfer.amount
                } tokens for ${buyOrSell.solTransfer.amount} SOL`
              );
              for (const listener of this.listeners) {
                listener({ transaction, buyOrSell });
              }
            } else {
              console.debug('Transaction does not match buy/sell criteria, ignored.');
            }
          } catch (error) {
            if (error.message.includes('Transaction version')) {
              console.warn(`Skipping unsupported transaction version: ${logs.signature}`);
            } else {
              console.error('Error processing transaction:', error.message);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting monitoring:', error.message);
    }
  }

  stopMonitoring() {
    if (this.subscriptionId) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      console.log('Monitoring stopped.');
    }
  }

  extractBuyAndSellFromTransaction(transaction) {
    try {
      const instructions = transaction.transaction.message.instructions;

      let solTransfer = null;
      let tokenTransfer = null;

      for (const instruction of instructions) {
        // Détection des transferts SOL
        if (instruction.programId.toBase58() === '11111111111111111111111111111111') {
          const parsed = instruction.parsed;
          if (parsed && parsed.info && parsed.info.lamports) {
            solTransfer = {
              amount: parsed.info.lamports / 1e9, // Convertir en SOL
              source: parsed.info.source,
              destination: parsed.info.destination,
            };
            console.debug('SOL transfer detected:', solTransfer);
          }
        }

        // Détection des transferts SPL Tokens
        if (instruction.programId.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          const parsed = instruction.parsed;
          if (parsed && parsed.info && parsed.info.tokenAmount) {
            tokenTransfer = {
              amount: parsed.info.tokenAmount.uiAmount,
              source: parsed.info.source,
              destination: parsed.info.destination,
            };
            console.debug('Token transfer detected:', tokenTransfer);
          }
        }
      }

      // Identifier un "buy" ou un "sell"
      if (solTransfer && tokenTransfer) {
        if (solTransfer.destination && tokenTransfer.source) {
          console.debug('Detected BUY transaction.');
          return { type: 'buy', solTransfer, tokenTransfer };
        } else if (solTransfer.source && tokenTransfer.destination) {
          console.debug('Detected SELL transaction.');
          return { type: 'sell', solTransfer, tokenTransfer };
        }
      }

      console.debug('No buy/sell match for transaction.');
      return null;
    } catch (error) {
      console.error('Error extracting buy/sell data:', error.message);
      return null;
    }
  }
}
