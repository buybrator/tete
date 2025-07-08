'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase, supabaseAdmin, MessageCache } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

const DEFAULT_AVATARS = [
  '🦊', '🐸', '🐱', '🐶', '🦁', '🐯', '🐨', '🐼'
];

// 🎯 메시지 캐시 최적화 설정
const MAX_MESSAGES_PER_ROOM = 500; // 방당 최대 메시지 수
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5분마다 정리
const MESSAGE_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24시간 보관

// 🚀 토큰 주소 매핑 (기존 UI 호환성 + 동적 CA 지원)
const ROOM_TOKEN_MAPPING: Record<string, string> = {
  'sol-usdc': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC Trading Room
  'btc-chat': 'So11111111111111111111111111111111111111112', // SOL Trading Room (임시)
  'general': 'So11111111111111111111111111111111111111112', // SOL Trading Room (임시)
};

// 🚀 roomId에서 토큰 주소 추출 (CA 직접 지원)
const getTokenAddressFromRoomId = (roomId: string): string | null => {
  // 정적 매핑 먼저 확인
  if (ROOM_TOKEN_MAPPING[roomId]) {
    return ROOM_TOKEN_MAPPING[roomId];
  }
  
  // CA 형식인지 확인 (Solana CA는 44자 Base58)
  if (roomId && roomId.length >= 32 && roomId.length <= 44) {
    return roomId;
  }
  
  return null;
};

// 실시간 메시지 상태 관리
let globalMessages: ChatMessage[] = [];
const messageListeners = new Set<() => void>();
let realtimeChannel: RealtimeChannel | null = null;

// 리스너 알림 함수
const notifyListeners = () => {
  messageListeners.forEach(listener => listener());
};

// Supabase 메시지를 ChatMessage로 변환 (프로필 정보 없이)
function formatMessageFromSupabase(dbMessage: MessageCache, roomId: string): ChatMessage {
  const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  
  // SOL 거래량 처리 - quantity가 lamports 단위인 경우 SOL로 변환
  let formattedAmount: string | undefined;
  if (dbMessage.quantity && dbMessage.quantity > 0) {
    // quantity가 1보다 큰 경우 lamports로 간주하고 SOL로 변환
    if (dbMessage.quantity >= 1000000000) { // 1 SOL = 1,000,000,000 lamports
      formattedAmount = (dbMessage.quantity / 1000000000).toFixed(3);
    } else if (dbMessage.quantity >= 1000000) { // 0.001 SOL = 1,000,000 lamports
      formattedAmount = (dbMessage.quantity / 1000000000).toFixed(6);
    } else {
      // 이미 SOL 단위인 경우
      formattedAmount = dbMessage.quantity.toString();
    }
  }
  
  return {
    id: dbMessage.signature,
    roomId,
    userId: dbMessage.sender_wallet.slice(0, 8),
    userAddress: dbMessage.sender_wallet,
    nickname: `${dbMessage.sender_wallet.slice(0, 4)}...${dbMessage.sender_wallet.slice(-4)}`,
    avatar: randomAvatar,
    content: dbMessage.content,
    timestamp: new Date(dbMessage.block_time),
    tradeType: dbMessage.message_type ? dbMessage.message_type.toLowerCase() as 'buy' | 'sell' : 'buy',
    tradeAmount: formattedAmount,
    txHash: dbMessage.signature,
  };
}

// Supabase에서 메시지 가져오기 (프로필은 ChatBubble에서 개별 조회)
async function fetchMessagesFromSupabase(roomId: string): Promise<ChatMessage[]> {
  try {
    const tokenAddress = getTokenAddressFromRoomId(roomId);
    if (!tokenAddress) {
      return [];
    }

    const { data, error } = await supabase
      .from('message_cache')
      .select('*')
      .eq('token_address', tokenAddress)
      .order('block_time', { ascending: true })
      .limit(100);

    if (error) {
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Supabase에서 메시지 로드됨
    return data.map(msg => formatMessageFromSupabase(msg, roomId));
  } catch (error) {
    return [];
  }
}

// Supabase에 메시지 저장
const saveMessageToSupabase = async (roomId: string, messageData: {
  content: string;
  trade_type: 'buy' | 'sell';
  trade_amount?: string;
  tx_hash?: string;
  user_address: string;
  nickname?: string;
  avatar?: string;
}): Promise<ChatMessage | null> => {
  try {
    const tokenAddress = getTokenAddressFromRoomId(roomId);
    if (!tokenAddress) {
      return null;
    }

    // 트랜잭션 해시가 없으면 임시 생성
    const signature = messageData.tx_hash || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabaseAdmin
      .from('message_cache')
      .insert({
        signature,
        token_address: tokenAddress,
        sender_wallet: messageData.user_address,
        message_type: messageData.trade_type.toUpperCase() as 'BUY' | 'SELL',
        content: messageData.content,
        quantity: messageData.trade_amount ? parseFloat(messageData.trade_amount) : null,
        price: null, // 가격 정보는 별도로 처리
        block_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase 저장 실패: ${error.message} (코드: ${error.code})`);
    }
    
    // 성공 시 로컬 상태에도 즉시 추가
    const newMessage = formatMessageFromSupabase(data, roomId);
    globalMessages = [...globalMessages, newMessage];
    notifyListeners();
    
    return newMessage;
  } catch (error) {
    throw error; // 오류를 다시 throw하여 호출자가 처리하도록
  }
};

// Realtime 구독 설정
const setupRealtimeSubscription = (roomId: string) => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }

  const tokenAddress = getTokenAddressFromRoomId(roomId);
  if (!tokenAddress) {
    return;
  }

  realtimeChannel = supabase
    .channel(`messages_${tokenAddress}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_cache',
        filter: `token_address=eq.${tokenAddress}`
      },
      (payload) => {
        const newMessage = formatMessageFromSupabase(payload.new as MessageCache, roomId);
        
        // 중복 제거
        if (!globalMessages.find(msg => msg.id === newMessage.id)) {
          globalMessages = [...globalMessages, newMessage];
          notifyListeners();
        }
      }
    )
    .subscribe();
};

export const addMessage = (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => {
  const messageData = {
    content: message.content,
    trade_type: message.tradeType,
    trade_amount: message.tradeAmount,
    tx_hash: message.txHash,
    user_address: message.userAddress,
    nickname: message.nickname,
    avatar: message.avatar,
  };
  
  saveMessageToSupabase(roomId, messageData);
};

export const getMessages = () => globalMessages;

export const useChatMessages = (roomId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { connected, publicKey } = useWallet();

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 메시지 리스너 등록
  useEffect(() => {
    if (!isClient) return;

    const updateMessages = () => {
      setMessages([...globalMessages]);
    };

    messageListeners.add(updateMessages);
    updateMessages(); // 초기 메시지 로드

    return () => {
      messageListeners.delete(updateMessages);
    };
  }, [isClient]);

  // 룸별 메시지 로드 및 실시간 구독
  useEffect(() => {
    if (!isClient || !roomId) return;

    const loadMessages = async () => {
      try {
        globalMessages = await fetchMessagesFromSupabase(roomId);
        notifyListeners();
        setupRealtimeSubscription(roomId);
      } catch (error) {
        // Handle error silently
      }
    };

    loadMessages();

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
      }
    };
  }, [roomId, isClient]);

  const sendMessage = useCallback((content: string) => {
    if (!publicKey || !isClient || !connected) {
      return;
    }

    const messageData = {
      content,
      trade_type: 'buy' as const,
      trade_amount: undefined,
      user_address: publicKey.toString(),
      nickname: undefined,
      avatar: '🎉',
    };

    saveMessageToSupabase(roomId, messageData);
  }, [roomId, isClient, connected, publicKey]);

  const checkMyTransactions = useCallback(() => {
    if (!publicKey) {
      return;
    }
  }, []);

  return {
    messages,
    sendMessage,
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => 
      roomId && isClient ? addMessage(roomId, message) : null,
    addMemoFromTransaction: (signature: string) => 
      null,
    checkMyTransactions,
  };
};

// 전역 정리 함수 (앱 종료 시 호출)
export function cleanupChatMessages() {
  globalMessages = [];
  messageListeners.clear();
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
} 