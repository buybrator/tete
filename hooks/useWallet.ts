'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ImageCacheManager } from '@/lib/utils';
import bs58 from 'bs58';

export const DEFAULT_AVATARS = ['👤', '🧑', '👩', '🤵', '👩‍💼', '🧑‍💼', '👨‍💼', '🧙‍♂️', '🧙‍♀️', '🥷'];

// 전역 인증 상태 관리 (React 상태 시스템과 독립적)
const authenticatingAddresses = new Set<string>();
const completedAddresses = new Set<string>();
const authenticationPromises = new Map<string, Promise<any>>();

export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

interface WalletProfile {
  wallet_address: string;
  nickname?: string;
  avatar?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function useWallet() {
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnecting, 
    wallet,
    wallets,
    select,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    sendTransaction
  } = useSolanaWallet();
  
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  // Local state
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // 지갑 주소
  const address = publicKey?.toBase58() || null;
  
  // 프로필에서 닉네임과 아바타 가져오기
  const nickname = profile?.nickname || '';
  
  // 아바타 처리: emoji: 접두사 제거 및 기본값 설정
  const avatar = useMemo(() => {
    const rawAvatar = profile?.avatar_url;
    if (!rawAvatar) return DEFAULT_AVATARS[0];
    
    // emoji: 접두사가 있으면 제거 (이모지인 경우)
    if (rawAvatar.startsWith('emoji:')) {
      return rawAvatar.replace('emoji:', '');
    }
    
    // HTTP URL이나 data URL인 경우 그대로 반환
    if (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')) {
      return rawAvatar;
    }
    
    // 그 외의 경우 (이모지 등) 그대로 반환
    return rawAvatar;
  }, [profile?.avatar_url]);
  
  // 지갑 인증
  const authenticateWallet = useCallback(async (walletAddress: string) => {
    try {
      // 1. 서명할 메시지 요청
      const msgResponse = await fetch(`/api/auth/wallet?walletAddress=${encodeURIComponent(walletAddress)}`, {
        credentials: 'include'
      });
      
      if (!msgResponse.ok) {
        throw new Error('Failed to get auth message');
      }
      
      const { message } = await msgResponse.json();
      
      // 2. 지갑으로 메시지 서명
      if (!signMessage) {
        throw new Error('Wallet does not support message signing');
      }
      
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      
      // 3. 서명 검증 및 토큰 생성
      const authResponse = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress,
          signature: bs58.encode(signature),
          message
        })
      });
      
      if (!authResponse.ok) {
        throw new Error('Authentication failed');
      }
      
      const authResult = await authResponse.json();
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }
      
      return authResult;
    } catch (error) {
      console.error('Wallet authentication error:', error);
      throw error;
    }
  }, [signMessage]);
  

  // 프로필 로드
  const loadProfile = useCallback(async (walletAddress: string) => {
    setIsLoadingProfile(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/profiles?wallet_address=${encodeURIComponent(walletAddress)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        if (result.profile) {
          console.log('Loaded profile:', result.profile);
          setProfile(result.profile);
          
          // 프로필 이미지 프리로딩
          if (result.profile.avatar_url && 
              (result.profile.avatar_url.startsWith('http') || 
               result.profile.avatar_url.startsWith('data:'))) {
            ImageCacheManager.preload(result.profile.avatar_url);
          }
        } else {
          // 프로필이 없으면 새로 생성
          await createProfile(walletAddress);
        }
      } else {
        throw new Error(result.error || 'Failed to load profile');
      }
    } catch {
      setError('Failed to load profile');
      // 프로필 로드 실패 시에도 빈 프로필로 설정하여 UI가 작동하도록 함
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);
  
  // 프로필 생성
  const createProfile = useCallback(async (walletAddress: string) => {
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: walletAddress,
          nickname: null,
          avatar_url: null
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.profile) {
        setProfile(result.profile);
      } else {
        throw new Error(result.error || 'Failed to create profile');
      }
    } catch {
      setError('Failed to create profile');
    }
  }, [setError]);
  
  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: { nickname?: string; avatar?: string }) => {
    if (!address) return;
    
    try {
      // 아바타 URL 처리
      let avatarUrl = updates.avatar || null;
      if (updates.avatar && !updates.avatar.startsWith('http') && !updates.avatar.startsWith('data:') && !updates.avatar.startsWith('emoji:')) {
        // 이모지인 경우에만 emoji: 접두사 추가
        if (DEFAULT_AVATARS.includes(updates.avatar)) {
          avatarUrl = `emoji:${updates.avatar}`;
        }
      }
      
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: address,
          nickname: updates.nickname?.trim() || null,
          avatar_url: avatarUrl
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setProfile(result.profile);
        
        // 전역 프로필 업데이트 이벤트 발생
        const profileUpdateEvent = new CustomEvent('profileUpdated', {
          detail: {
            walletAddress: address,
            profile: result.profile
          }
        });
        window.dispatchEvent(profileUpdateEvent);
      }
    } catch {
      setError('Failed to update profile');
    }
  }, [address]);
  
  // 잔고 조회
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    setIsLoadingBalance(true);
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Balance] Attempting to fetch balance (attempt ${attempt}/${maxRetries})`);
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
        setError(null);
        setIsLoadingBalance(false);
        console.log(`[Balance] Successfully fetched balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        return;
      } catch (error) {
        lastError = error;
        console.error(`[Balance] Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[Balance] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error('[Balance] All balance fetch attempts failed:', lastError);
    setError('Failed to fetch balance. Please try again later.');
    setBalance(null);
    setIsLoadingBalance(false);
  }, [publicKey, connection]);
  
  // 지갑 연결
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      
      if (!wallet) {
        // 지갑이 선택되지 않은 경우 모달 열기
        setVisible(true);
        return;
      }
      
      // 이미 연결된 경우
      if (connected) {
        return;
      }
      
      // 연결 시도
      await connect();
    } catch (error) {
      
      if (error instanceof Error) {
        if (error.name === 'WalletNotReadyError') {
          setError('Wallet not installed. Please install Phantom or Solflare.');
        } else if (error.name === 'WalletNotSelectedError') {
          setError('Please select a wallet.');
        } else {
          setError(error.message || 'Failed to connect wallet');
        }
      } else {
        setError('Failed to connect wallet');
      }
    }
  }, [wallet, connected, connect, setVisible]);
  
  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setProfile(null);
      setBalance(null);
      setError(null);
    } catch {
      setError('Failed to disconnect wallet');
    }
  }, [disconnect]);
  
  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // 기존 인증 상태 확인 (쿠키의 JWT 토큰 활용)
  const checkExistingAuth = useCallback(async (walletAddress: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.valid && result.walletAddress === walletAddress && result.profile) {
          console.log('Found existing valid authentication for:', walletAddress);
          setProfile(result.profile);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to check existing auth:', error);
    }
    return false;
  }, []);

  // 지갑 연결 시 인증 및 프로필 로드
  useEffect(() => {
    const handleWalletConnect = async () => {
      if (connected && address) {
        // 이미 동일한 주소에 대한 인증 Promise가 진행 중이면 기다림
        if (authenticationPromises.has(address)) {
          console.log('Authentication promise already exists for:', address, '- waiting for completion');
          try {
            await authenticationPromises.get(address);
            console.log('Authentication promise completed for:', address);
            fetchBalance();
            return;
          } catch (error) {
            console.error('Authentication promise failed for:', address, error);
            authenticationPromises.delete(address);
          }
        }
        
        // 이미 인증 진행 중이면 스킵 (추가 보안)
        if (authenticatingAddresses.has(address)) {
          console.log('Authentication already in progress for:', address);
          return;
        }
        
        // 인증 Promise 생성 및 캐시
        const authPromise = (async () => {
          try {
            // 1. 먼저 기존 인증 상태 확인 (쿠키의 JWT 토큰)
            const hasValidAuth = await checkExistingAuth(address);
            
            if (hasValidAuth) {
              console.log('Using existing authentication for:', address);
              completedAddresses.add(address);
              return;
            }
            
            // 2. 이미 완료된 경우 프로필만 로드
            if (completedAddresses.has(address)) {
              console.log('Authentication already completed, loading profile for:', address);
              await loadProfile(address);
              return;
            }
            
            // 3. 새로운 인증 필요
            console.log('Starting new wallet authentication for:', address);
            authenticatingAddresses.add(address);
            
            await authenticateWallet(address);
            await loadProfile(address);
            
            authenticatingAddresses.delete(address);
            completedAddresses.add(address);
            console.log('Wallet authentication completed for:', address);
            
          } catch (error) {
            console.error('Failed to authenticate wallet:', error);
            authenticatingAddresses.delete(address);
            setError('Failed to authenticate wallet. Please try again.');
            throw error;
          } finally {
            // Promise 완료 후 캐시에서 제거
            authenticationPromises.delete(address);
          }
        })();
        
        // Promise를 캐시에 저장
        authenticationPromises.set(address, authPromise);
        
        try {
          await authPromise;
          fetchBalance();
        } catch (error) {
          // 에러는 이미 authPromise 내부에서 처리됨
        }
        
      } else if (!connected) {
        setProfile(null);
        setBalance(null);
        setError(null);
        // 연결 해제 시 인증 진행 중 상태만 정리
        if (address) {
          authenticatingAddresses.delete(address);
          authenticationPromises.delete(address);
          // completedAddresses는 유지하여 재연결 시 기존 인증 상태 활용
        }
      }
    };
    
    handleWalletConnect();
  }, [connected, address, checkExistingAuth]);
  
  return {
    // 연결 상태
    isConnected: connected,
    isConnecting: connecting,
    isDisconnecting: disconnecting,
    
    // 지갑 정보
    address,
    publicKey,
    wallet,
    wallets,
    
    // 프로필 정보
    profile,
    nickname,
    avatar,
    isLoadingProfile,
    
    // 잔고 정보
    balance,
    isLoadingBalance,
    
    // 에러 상태
    error,
    
    // 액션
    connectWallet,
    disconnectWallet,
    updateProfile,
    fetchBalance,
    clearError,
    select,
    
    // 서명 함수들
    signMessage,
    signTransaction,
    sendTransaction,
    
    // 모달 제어
    setVisible
  };
}
