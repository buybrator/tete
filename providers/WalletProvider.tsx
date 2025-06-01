'use client';

import React, { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { getSolanaConnection, getCurrentNetwork } from '@/lib/solana';

// Wallet Adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderWrapperProps {
  children: React.ReactNode;
}

export default function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  // 현재 네트워크 설정 가져오기
  const network = getCurrentNetwork();
  
  // Wallet Adapter 네트워크 매핑
  const walletNetwork = useMemo(() => {
    switch (network) {
      case 'mainnet':
        return WalletAdapterNetwork.Mainnet;
      case 'devnet':
        return WalletAdapterNetwork.Devnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, [network]);

  // RPC 엔드포인트 가져오기
  const connection = useMemo(() => getSolanaConnection(), []);
  const endpoint = useMemo(() => connection.rpcEndpoint, [connection]);

  // 지원할 지갑 목록
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: walletNetwork }),
    ],
    [walletNetwork]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// 지갑 연결 상태를 확인하는 헬퍼 함수들
export { useWallet, useConnection } from '@solana/wallet-adapter-react'; 