'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletState, UserProfile } from '@/types';
import { safePublicKeyToString } from '@/lib/wallet-utils';

const DEFAULT_AVATARS = ['👤', '🧑', '👩', '🤵', '👩‍💼', '🧑‍💼', '👨‍💼', '🧙‍♂️', '🧙‍♀️', '🥷'];

// 지갑 주소를 축약된 형태로 변환
export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export function useWallet() {
  // Solana Wallet Adapter 사용
  const { 
    publicKey, 
    connected, 
    connect, 
    disconnect,
    signMessage
  } = useSolanaWallet();

  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    nickname: null,
    avatar: DEFAULT_AVATARS[0],
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // 지갑 연결 상태 동기화
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = safePublicKeyToString(publicKey);
      
      if (!walletAddress) {
        console.error('❌ 유효하지 않은 PublicKey');
        return;
      }
      
      console.log('🔗 Solana Wallet Adapter 연결됨:', walletAddress);
      
      // 🚨 자동 인증 비활성화 - 수동으로 인증하도록 변경
      // handleAuthentication(walletAddress);
      
      // 단순히 연결 상태만 업데이트
      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        address: walletAddress,
      }));
      
    } else if (!connected) {
      console.log('❌ Solana Wallet Adapter 연결 해제됨');
      handleDisconnection();
    }
  }, [connected, publicKey]);

  // 인증 처리 함수
  const handleAuthentication = async (walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 이미 인증된 상태인지 확인
      if (walletState.isConnected && walletState.address === walletAddress) {
        return;
      }

      console.log('🔐 지갑 인증 시작:', walletAddress);

      // 인증 메시지 요청
      const messageResponse = await fetch(`/api/auth/wallet?walletAddress=${encodeURIComponent(walletAddress)}`, {
        method: 'GET',
      });
      
      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error || '인증 메시지 생성에 실패했습니다.');
      }
      
      const { message } = await messageResponse.json();

      // 메시지 서명 요청
      if (!signMessage) {
        throw new Error('지갑에서 메시지 서명을 지원하지 않습니다.');
      }

      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await signMessage(encodedMessage);

      // 서명을 hex 문자열로 변환
      const signature = Array.from(signedMessage)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 서버에 인증 요청
      const authResponse = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message,
        }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || '인증에 실패했습니다.');
      }

      // 인증 성공
      const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
      
      setWalletState({
        isConnected: true,
        address: walletAddress,
        nickname: authData.profile.nickname,
        avatar: randomAvatar,
      });

      setUserProfile({
        id: authData.profile.wallet_address,
        address: authData.profile.wallet_address,
        nickname: authData.profile.nickname,
        avatar: randomAvatar,
        createdAt: new Date(authData.profile.created_at),
        updatedAt: new Date(authData.profile.updated_at),
      });

      setAuthToken(authData.token);

      // 토큰을 localStorage에 저장
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('walletAddress', walletAddress);

      console.log('✅ 지갑 인증 완료');

    } catch (error) {
      console.error('❌ 지갑 인증 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 인증에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 연결 해제 처리
  const handleDisconnection = () => {
    setWalletState({
      isConnected: false,
      address: null,
      nickname: null,
      avatar: DEFAULT_AVATARS[0],
    });
    setUserProfile(null);
    setAuthToken(null);

    // localStorage 정리
    localStorage.removeItem('authToken');
    localStorage.removeItem('walletAddress');
    
    console.log('🔌 지갑 연결 해제 완료');
  };

  // 지갑 연결
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔗 지갑 연결 시도...');
      await connect();
      
    } catch (error) {
      console.error('❌ 지갑 연결 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 연결에 실패했습니다.');
      setIsLoading(false);
    }
  }, [connect]);

  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    try {
      console.log('🔌 지갑 연결 해제 시도...');
      await disconnect();
    } catch (error) {
      console.error('❌ 지갑 연결 해제 오류:', error);
    }
  }, [disconnect]);

  // 저장된 토큰으로 자동 로그인 시도
  const tryAutoLogin = useCallback(async () => {
    const savedToken = localStorage.getItem('authToken');
    const savedAddress = localStorage.getItem('walletAddress');

    if (!savedToken || !savedAddress) return;

    setIsLoading(true);

    try {
      // 토큰 검증
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${savedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

        setWalletState({
          isConnected: true,
          address: data.walletAddress,
          nickname: data.profile.nickname,
          avatar: randomAvatar,
        });

        setUserProfile({
          id: data.profile.wallet_address,
          address: data.profile.wallet_address,
          nickname: data.profile.nickname,
          avatar: randomAvatar,
          createdAt: new Date(data.profile.created_at),
          updatedAt: new Date(data.profile.updated_at),
        });

        setAuthToken(savedToken);
      } else {
        // 토큰이 유효하지 않으면 정리
        localStorage.removeItem('authToken');
        localStorage.removeItem('walletAddress');
      }
    } catch (error) {
      console.error('자동 로그인 실패:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('walletAddress');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 닉네임 업데이트
  const updateNickname = useCallback((newNickname: string) => {
    setWalletState(prev => ({
      ...prev,
      nickname: newNickname || (prev.address ? formatWalletAddress(prev.address) : null),
    }));
  }, []);

  // 아바타 업데이트
  const updateAvatar = useCallback((newAvatar: string) => {
    setWalletState(prev => ({
      ...prev,
      avatar: newAvatar,
    }));
  }, []);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userProfile || !authToken) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: 프로필 업데이트 API 호출
      const updatedProfile = {
        ...userProfile,
        ...updates,
        updatedAt: new Date(),
      };
      setUserProfile(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, authToken]);

  // 잔액 새로고침
  const refreshBalance = useCallback(async () => {
    if (!walletState.isConnected || !walletState.address) return;

    setIsLoading(true);
    
    try {
      // TODO: 실제 Solana 잔액 조회 로직
      const mockBalance = Math.random() * 20;
      setWalletState(prev => ({ ...prev, balance: mockBalance }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '잔액 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, walletState.address]);

  // 초기 연결 상태 확인
  useEffect(() => {
    tryAutoLogin();
  }, [tryAutoLogin]);

  return {
    walletState,
    userProfile,
    isLoading,
    error,
    authToken,
    connectWallet,
    disconnectWallet,
    tryAutoLogin,
    authenticate: handleAuthentication,
    updateProfile,
    refreshBalance,
    updateNickname,
    updateAvatar,
    isAuthenticated: !!authToken,
    formatWalletAddress,
    DEFAULT_AVATARS,
    clearError: () => setError(null),
  };
} 