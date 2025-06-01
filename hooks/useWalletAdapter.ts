'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { createStableConnection, checkSolanaConnection } from '@/lib/solana';
import { Connection } from '@solana/web3.js';

interface WalletAdapterState {
  // 연결 상태
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  
  // 지갑 정보
  publicKey: PublicKey | null;
  walletName: string | null;
  
  // 잔고 정보
  balance: number | null;
  isLoadingBalance: boolean;
  
  // 에러 상태
  error: string | null;
}

interface TransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

export function useWalletAdapter() {
  const { 
    publicKey, 
    connected,
    connecting,
    disconnecting,
    wallet,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage
  } = useWallet();
  
  const { connection } = useConnection();

  // 상태 관리
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지갑 상태
  const walletState: WalletAdapterState = {
    isConnected: connected,
    isConnecting: connecting,
    isDisconnecting: disconnecting,
    publicKey,
    walletName: wallet?.adapter.name || null,
    balance,
    isLoadingBalance,
    error,
  };

  // 지갑 연결
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      await connect();
    } catch (error) {
      console.error('지갑 연결 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 연결에 실패했습니다.');
    }
  }, [connect]);

  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    try {
      setError(null);
      await disconnect();
      setBalance(null);
    } catch (error) {
      console.error('지갑 연결 해제 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 연결 해제에 실패했습니다.');
    }
  }, [disconnect]);

  // 안정적인 연결 확보
  const getStableConnection = useCallback(async (): Promise<Connection> => {
    try {
      // 현재 연결 상태 확인
      const healthCheck = await checkSolanaConnection(connection);
      if (healthCheck.connected) {
        return connection;
      }
      
      // 연결이 불안정하면 새로운 안정적인 연결 생성
      console.log('Current connection unstable, finding healthy endpoint...');
      return await createStableConnection();
    } catch (error) {
      console.error('Failed to get stable connection:', error);
      // fallback to current connection
      return connection;
    }
  }, [connection]);

  // 잔고 조회 (안정적인 연결 사용)
  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    try {
      setIsLoadingBalance(true);
      setError(null);
      
      const connection = await getStableConnection();
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;
      setBalance(solBalance);
    } catch (error) {
      console.error('잔고 조회 실패:', error);
      setError('잔고를 불러오는데 실패했습니다.');
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [publicKey, getStableConnection]);

  // 트랜잭션 전송
  const sendSolanaTransaction = useCallback(async (
    transaction: Transaction,
    options: TransactionOptions = {}
  ): Promise<string> => {
    if (!publicKey) {
      throw new WalletNotConnectedError();
    }

    try {
      setError(null);
      
      // 최신 블록해시 가져오기
      const connection = await getStableConnection();
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 트랜잭션 전송
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: options.skipPreflight,
        preflightCommitment: options.preflightCommitment || 'confirmed',
      });

      // 트랜잭션 확인 대기
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`트랜잭션 실패: ${confirmation.value.err}`);
      }

      console.log('트랜잭션 성공:', signature);
      
      // 잔고 업데이트
      await fetchBalance();
      
      return signature;
    } catch (error) {
      console.error('트랜잭션 전송 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '트랜잭션 전송에 실패했습니다.';
      setError(errorMessage);
      throw error;
    }
  }, [publicKey, sendTransaction, getStableConnection]);

  // SOL 전송
  const sendSol = useCallback(async (
    recipient: string | PublicKey,
    amount: number
  ): Promise<string> => {
    if (!publicKey) {
      throw new WalletNotConnectedError();
    }

    try {
      const recipientPubkey = typeof recipient === 'string' 
        ? new PublicKey(recipient) 
        : recipient;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      return await sendSolanaTransaction(transaction);
    } catch (error) {
      console.error('SOL 전송 실패:', error);
      throw error;
    }
  }, [publicKey, sendSolanaTransaction]);

  // 메시지 서명
  const signWalletMessage = useCallback(async (message: string): Promise<Uint8Array> => {
    if (!signMessage) {
      throw new Error('지갑이 메시지 서명을 지원하지 않습니다.');
    }

    try {
      setError(null);
      const messageBytes = new TextEncoder().encode(message);
      return await signMessage(messageBytes);
    } catch (error) {
      console.error('메시지 서명 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '메시지 서명에 실패했습니다.';
      setError(errorMessage);
      throw error;
    }
  }, [signMessage]);

  // 트랜잭션 서명 (전송하지 않음)
  const signWalletTransaction = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (!signTransaction) {
      throw new Error('지갑이 트랜잭션 서명을 지원하지 않습니다.');
    }

    if (!publicKey) {
      throw new WalletNotConnectedError();
    }

    try {
      setError(null);
      
      // 최신 블록해시 설정
      const connection = await getStableConnection();
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      return await signTransaction(transaction);
    } catch (error) {
      console.error('트랜잭션 서명 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '트랜잭션 서명에 실패했습니다.';
      setError(errorMessage);
      throw error;
    }
  }, [signTransaction, publicKey, getStableConnection]);

  // 여러 트랜잭션 서명
  const signAllWalletTransactions = useCallback(async (transactions: Transaction[]): Promise<Transaction[]> => {
    if (!signAllTransactions) {
      throw new Error('지갑이 다중 트랜잭션 서명을 지원하지 않습니다.');
    }

    if (!publicKey) {
      throw new WalletNotConnectedError();
    }

    try {
      setError(null);
      
      // 모든 트랜잭션에 최신 블록해시 설정
      const connection = await getStableConnection();
      const { blockhash } = await connection.getLatestBlockhash();
      transactions.forEach(transaction => {
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
      });

      return await signAllTransactions(transactions);
    } catch (error) {
      console.error('다중 트랜잭션 서명 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '트랜잭션 서명에 실패했습니다.';
      setError(errorMessage);
      throw error;
    }
  }, [signAllTransactions, publicKey, getStableConnection]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 연결 상태가 변경될 때 잔고 조회
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, fetchBalance]);

  return {
    // 상태
    ...walletState,
    
    // 액션
    connect: connectWallet,
    disconnect: disconnectWallet,
    fetchBalance,
    sendTransaction: sendSolanaTransaction,
    sendSol,
    signMessage: signWalletMessage,
    signTransaction: signWalletTransaction,
    signAllTransactions: signAllWalletTransactions,
    clearError,
    
    // 헬퍼
    formatAddress: (address?: string) => {
      if (!address) return '';
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    },
    
    formatBalance: (balance?: number | null) => {
      if (balance === null || balance === undefined) return 'N/A';
      return `${balance.toFixed(4)} SOL`;
    },
  };
}

export default useWalletAdapter; 