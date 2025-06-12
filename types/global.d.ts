import { Transaction } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
      signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      publicKey?: string;
    };
  }
}

export {}; 