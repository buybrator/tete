'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ImageCacheManager } from '@/lib/utils';

export const DEFAULT_AVATARS = ['👤', '🧑', '👩', '🤵', '👩‍💼', '🧑‍💼', '👨‍💼', '🧙‍♂️', '🧙‍♀️', '🥷'];

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
    
    // emoji: 접두사가 있으면 제거
    if (rawAvatar.startsWith('emoji:')) {
      return rawAvatar.replace('emoji:', '');
    }
    
    return rawAvatar;
  }, [profile?.avatar_url]);
  
  // 지갑 연결 시 프로필 로드
  useEffect(() => {
    if (connected && address) {
      loadProfile(address);
      fetchBalance();
    } else {
      setProfile(null);
      setBalance(null);
    }
  }, [connected, address]);
  
  // 프로필 로드
  const loadProfile = useCallback(async (walletAddress: string) => {
    setIsLoadingProfile(true);
    setError(null);
    
    try {
      console.log('🔄 프로필 로드 시작:', walletAddress);
      const response = await fetch(`/api/profiles?wallet_address=${encodeURIComponent(walletAddress)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 프로필 API 응답:', result);
      
      if (result.success) {
        if (result.profile) {
          setProfile(result.profile);
          console.log('✅ 기존 프로필 로드 성공:', result.profile);
          
          // 프로필 이미지 프리로딩
          if (result.profile.avatar_url && 
              (result.profile.avatar_url.startsWith('http') || 
               result.profile.avatar_url.startsWith('data:'))) {
            ImageCacheManager.preload(result.profile.avatar_url);
          }
        } else {
          console.log('📝 프로필이 없어서 새로 생성');
          // 프로필이 없으면 새로 생성
          await createProfile(walletAddress);
        }
      } else {
        throw new Error(result.error || '프로필 로드 실패');
      }
    } catch (error) {
      console.error('❌ 프로필 로드 실패:', error);
      setError('프로필 로드에 실패했습니다');
      // 프로필 로드 실패 시에도 빈 프로필로 설정하여 UI가 작동하도록 함
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);
  
  // 프로필 생성
  const createProfile = useCallback(async (walletAddress: string) => {
    try {
      console.log('🆕 새 프로필 생성 시작:', walletAddress);
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.log('📥 프로필 생성 API 응답:', result);
      
      if (result.success && result.profile) {
        setProfile(result.profile);
        console.log('✅ 새 프로필 생성 성공:', result.profile);
      } else {
        throw new Error(result.error || '프로필 생성 실패');
      }
    } catch (error) {
      console.error('❌ 프로필 생성 실패:', error);
      setError('프로필 생성에 실패했습니다');
    }
  }, [setError]);
  
  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: { nickname?: string; avatar?: string }) => {
    if (!address) return;
    
    try {
      // 아바타 URL 처리
      let avatarUrl = null;
      if (updates.avatar) {
        if (updates.avatar.startsWith('http') || updates.avatar.startsWith('data:')) {
          avatarUrl = updates.avatar;
        } else if (DEFAULT_AVATARS.includes(updates.avatar)) {
          avatarUrl = `emoji:${updates.avatar}`;
        }
      }
      
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          nickname: updates.nickname?.trim() || null,
          avatar_url: avatarUrl
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setProfile(result.profile);
        console.log('✅ 프로필 업데이트 성공');
        
        // 전역 프로필 업데이트 이벤트 발생
        const profileUpdateEvent = new CustomEvent('profileUpdated', {
          detail: {
            walletAddress: address,
            profile: result.profile
          }
        });
        window.dispatchEvent(profileUpdateEvent);
        console.log('📢 프로필 업데이트 이벤트 발생:', address);
      }
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      setError('프로필 업데이트에 실패했습니다');
    }
  }, [address]);
  
  // 잔고 조회
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
      setError(null);
    } catch (error) {
      console.error('❌ 잔고 조회 실패:', error);
      setError('잔고 조회에 실패했습니다');
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
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
        console.log('✅ 이미 지갑이 연결되어 있습니다');
        return;
      }
      
      // 연결 시도
      await connect();
      console.log('✅ 지갑 연결 성공');
    } catch (error) {
      console.error('❌ 지갑 연결 실패:', error);
      
      if (error instanceof Error) {
        if (error.name === 'WalletNotReadyError') {
          setError('지갑이 설치되지 않았습니다. Phantom 또는 Solflare를 설치해주세요.');
        } else if (error.name === 'WalletNotSelectedError') {
          setError('지갑을 선택해주세요.');
        } else {
          setError(error.message || '지갑 연결에 실패했습니다');
        }
      } else {
        setError('지갑 연결에 실패했습니다');
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
      console.log('✅ 지갑 연결 해제 성공');
    } catch (error) {
      console.error('❌ 지갑 연결 해제 실패:', error);
      setError('지갑 연결 해제에 실패했습니다');
    }
  }, [disconnect]);
  
  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
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
