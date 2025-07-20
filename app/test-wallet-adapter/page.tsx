'use client';

import React, { useEffect } from 'react';
import { useWalletAdapter } from '@/hooks/useWalletAdapter';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet } from '@/providers/WalletProvider';
import WalletAdapter, { WalletButton } from '@/components/WalletAdapter';
import ClientOnly from '@/components/ClientOnly';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// 로딩 상태 컴포넌트
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
    </div>
  );
}

export default function TestWalletAdapterPage() {
  const {
    publicKey,
    isConnected,
    isConnecting,
    walletName,
    balance,
    error,
    disconnect,
    fetchBalance,
    formatBalance,
    formatAddress,
    clearError,
  } = useWalletAdapter();

  const { setVisible } = useWalletModal();
  const { 
    wallet, 
    connected: solanaConnected, 
    disconnect: solanaDisconnect,
    connect: solanaConnect,
    select,
    wallets
  } = useSolanaWallet();

  // useWallet 훅 (프로필 관리용)
  const {
    isConnected: walletConnected,
    address: walletAddress,
    avatar: walletAvatar,
    nickname: walletNickname,
    profile: userProfile,
    isLoadingProfile: isAuthLoading,
    error: authError,
    clearError: clearAuthError,
  } = useWallet();

  // 지갑 상태 변화 모니터링
  useEffect(() => {
  }, [isConnected, solanaConnected, publicKey, walletName, wallet, walletConnected, walletAddress]);

  // 안전한 연결 해제 핸들러
  const handleSafeDisconnect = async () => {
    try {
      await disconnect();
    } catch {
    }
  };

  // Solana 어댑터 직접 연결 해제
  const handleSolanaDisconnect = async () => {
    try {
      if (solanaDisconnect && typeof solanaDisconnect === 'function') {
        await solanaDisconnect();
      }
    } catch {
    }
  };

  // 직접 연결 시도
  const handleDirectConnect = async () => {
    try {
      if (solanaConnect && typeof solanaConnect === 'function') {
        await solanaConnect();
      }
    } catch {
    }
  };

  // 특정 지갑 선택 후 즉시 연결
  const handleSelectPhantom = async () => {
    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet) {
        // 1단계: 지갑 선택
        select(phantomWallet.adapter.name);
        
        // 2단계: 잠깐 기다린 후 연결 시도
        setTimeout(async () => {
          try {
            if (solanaConnect && typeof solanaConnect === 'function') {
              await solanaConnect();
            }
          } catch {
          }
        }, 500); // 500ms 후 연결 시도
        
      }
    } catch {
    }
  };

  // 브라우저 지갑 직접 확인
  const checkBrowserWallets = () => {
    const windowWithWallets = window as typeof window & {
      phantom?: { solana?: { isPhantom?: boolean } };
      solflare?: { isConnected?: boolean };
      solana?: { isPhantom?: boolean };
    };
    
    const hasPhantom = !!(windowWithWallets.phantom?.solana?.isPhantom || windowWithWallets.solana?.isPhantom);
    const hasSolflare = !!windowWithWallets.solflare;
    
    alert(`브라우저 지갑 감지:\n\nPhantom: ${hasPhantom ? '✅ 감지됨' : '❌ 없음'}\nSolflare: ${hasSolflare ? '✅ 감지됨' : '❌ 없음'}`);
  };

  // 직접 Phantom API 호출
  const handleDirectPhantomConnect = async () => {
    try {
      if (typeof window !== 'undefined' && 'phantom' in window) {
        const windowWithPhantom = window as typeof window & {
          phantom?: {
            solana?: {
              isPhantom?: boolean;
              connect?: () => Promise<{ publicKey: unknown }>;
              isConnected?: boolean;
            };
          };
        };
        
        const phantom = windowWithPhantom.phantom?.solana;
        
                 if (phantom?.isPhantom && phantom.connect) {
           await phantom.connect();
          
          // 연결 후 wallet adapter와 동기화
          const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
          if (phantomWallet) {
            select(phantomWallet.adapter.name);
          }
          
        }
      }
    } catch {
    }
  };

  // 프로필 인증 (지갑 서명으로 프로필 저장)
  const handleAuthenticate = async () => {
    if (!publicKey) {
      return;
    }

    try {
      // 현재 useWallet 훅에서는 별도의 authenticate 함수가 없으므로 프로필만 확인
    } catch {
    }
  };

  // 새로운 useWallet 테스트
  const testNewUseWallet = () => {
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">지갑 어댑터 테스트</h1>
        <p className="text-muted-foreground">
          Solana 지갑 어댑터 기능을 테스트하는 페이지입니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 지갑 모달 테스트 */}
        <Card>
          <CardHeader>
            <CardTitle>지갑 모달 테스트</CardTitle>
            <CardDescription>
              지갑 선택 모달이 제대로 열리는지 테스트
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ClientOnly fallback={<Button disabled className="w-full">로딩 중...</Button>}>
              <Button 
                onClick={() => setVisible(true)}
                className="w-full"
              >
                지갑 모달 열기
              </Button>
              <Button 
                onClick={handleDirectConnect}
                variant="neutral"
                className="w-full"
              >
                직접 연결 시도
              </Button>
              <Button 
                onClick={handleSelectPhantom}
                variant="neutral"
                className="w-full"
              >
                Phantom 선택 후 연결
              </Button>
              <Button 
                onClick={checkBrowserWallets}
                variant="neutral"
                className="w-full"
              >
                브라우저 지갑 확인
              </Button>
              <Button 
                onClick={handleDirectPhantomConnect}
                variant="neutral"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                👻 직접 Phantom API 연결
              </Button>
              <Button 
                onClick={testNewUseWallet}
                variant="neutral"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                🧪 새 useWallet 테스트
              </Button>
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 프로필 인증 테스트 */}
        <Card>
          <CardHeader>
            <CardTitle>프로필 인증 테스트</CardTitle>
            <CardDescription>
              지갑 연결 후 프로필 저장 기능 테스트
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ClientOnly fallback={<LoadingSkeleton />}>
              <Button 
                onClick={handleAuthenticate}
                disabled={!isConnected || isAuthLoading}
                className="w-full"
              >
                {isAuthLoading ? '인증 중...' : '프로필 인증 및 저장'}
              </Button>
              
              <div className="text-sm space-y-1">
                <div>연결 상태: 
                  <Badge variant={walletConnected ? "default" : "neutral"} className="ml-1">
                    {walletConnected ? '연결됨' : '미연결'}
                  </Badge>
                </div>
                {userProfile && (
                  <>
                    <div>닉네임: {userProfile && typeof userProfile === 'object' && 'nickname' in userProfile ? (userProfile as { nickname?: string }).nickname || 'N/A' : 'N/A'}</div>
                    <div>아바타: {walletAvatar}</div>
                    <div>지갑 주소: {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'N/A'}</div>
                  </>
                )}
              </div>
              
              {authError && (
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded text-sm">
                  {authError}
                  <Button
                    onClick={clearAuthError}
                    variant="neutral"
                    size="sm"
                    className="ml-2 h-auto p-1"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 기본 지갑 어댑터 컴포넌트 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 지갑 어댑터</CardTitle>
            <CardDescription>
              모든 기본 기능을 포함한 지갑 어댑터 컴포넌트
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<LoadingSkeleton />}>
              <WalletAdapter />
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 간단한 지갑 버튼 */}
        <Card>
          <CardHeader>
            <CardTitle>간단한 지갑 버튼</CardTitle>
            <CardDescription>
              현재 연결 상태만 표시하는 간단한 버튼
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<Button disabled className="w-full">로딩 중...</Button>}>
              <WalletButton className="w-full" />
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 지갑 정보 표시 */}
        <Card>
          <CardHeader>
            <CardTitle>지갑 정보</CardTitle>
            <CardDescription>
              현재 연결된 지갑의 상세 정보
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ClientOnly fallback={<LoadingSkeleton />}>
              <div>
                <Label className="font-medium">연결 상태</Label>
                <Badge variant={isConnected ? "default" : "neutral"} className="ml-2">
                  {isConnected ? '연결됨' : '연결 안됨'}
                </Badge>
              </div>
              
              <div>
                <Label className="font-medium">지갑 이름</Label>
                <p className="text-sm text-muted-foreground">
                  {walletName || 'N/A'}
                </p>
              </div>
              
              <div>
                <Label className="font-medium">지갑 주소</Label>
                <p className="text-sm text-muted-foreground font-mono">
                  {publicKey ? formatAddress(publicKey.toString()) : 'N/A'}
                </p>
              </div>
              
              <div>
                <Label className="font-medium">잔고</Label>
                <p className="text-sm text-muted-foreground">
                  {formatBalance(balance)}
                </p>
              </div>
              
              {error && (
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded text-sm">
                  {error}
                </div>
              )}
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 지갑 액션 테스트 */}
        <Card>
          <CardHeader>
            <CardTitle>지갑 액션</CardTitle>
            <CardDescription>
              지갑 연결 해제 기능을 안전하게 테스트
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ClientOnly fallback={<LoadingSkeleton />}>
              <Button 
                onClick={fetchBalance}
                disabled={!isConnected}
                variant="neutral"
                className="w-full"
              >
                잔고 새로고침
              </Button>
              
              {isConnected && (
                <>
                  <Button 
                    onClick={handleSafeDisconnect}
                    variant="neutral"
                    className="w-full"
                  >
                    안전 연결 해제
                  </Button>

                  <Button 
                    onClick={handleSolanaDisconnect}
                    variant="neutral"
                    className="w-full"
                  >
                    Solana 어댑터 직접 해제
                  </Button>
                </>
              )}
              
              {error && (
                <Button 
                  onClick={clearError}
                  variant="neutral"
                  size="sm"
                  className="w-full"
                >
                  에러 클리어
                </Button>
              )}
            </ClientOnly>
          </CardContent>
        </Card>

        {/* 연결 상태 디버깅 */}
        <Card>
          <CardHeader>
            <CardTitle>디버깅 정보</CardTitle>
            <CardDescription>
              현재 상태를 확인하기 위한 디버깅 정보
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ClientOnly fallback={<LoadingSkeleton />}>
              <div className="text-xs space-y-1">
                <div>useWalletAdapter.isConnected: {isConnected.toString()}</div>
                <div>useWalletAdapter.isConnecting: {isConnecting.toString()}</div>
                <div>useWallet.connected: {solanaConnected.toString()}</div>
                <div>publicKey: {publicKey?.toString() || 'null'}</div>
                <div>walletName: {walletName || 'null'}</div>
                <div>wallet.adapter.name: {wallet?.adapter?.name || 'null'}</div>
                <div>balance: {balance?.toString() || 'null'}</div>
                <div>disconnect function: {typeof disconnect}</div>
                <div>solanaDisconnect function: {typeof solanaDisconnect}</div>
                <div>available wallets: {wallets.length}</div>
                <div>wallet names: {wallets.map(w => w.adapter.name).join(', ')}</div>
                <div className="border-t pt-1">
                  <div>walletConnected: {walletConnected.toString()}</div>
                  <div>walletAddress: {walletAddress || 'null'}</div>
                  <div>userProfile: {userProfile ? '✅' : '❌'}</div>
                  <div>walletAvatar: {walletAvatar || 'null'}</div>
                  <div>walletNickname: {walletNickname || 'null'}</div>
                </div>
              </div>
            </ClientOnly>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 