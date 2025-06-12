'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase, supabaseAdmin, MessageCache } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_AVATARS = [
  '🦊', '🐸', '🐱', '🐶', '🦁', '🐯', '🐨', '🐼'
];

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
    console.log(`🎯 CA를 roomId로 직접 사용: ${roomId}`);
    return roomId;
  }
  
  console.error(`❌ 유효하지 않은 roomId: ${roomId}`);
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

// Supabase 메시지를 ChatMessage로 변환
function formatMessageFromSupabase(dbMessage: MessageCache, roomId: string): ChatMessage {
  const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  
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
    tradeAmount: dbMessage.quantity ? `${dbMessage.quantity}` : undefined,
    txHash: dbMessage.signature,
  };
}

// Supabase에서 메시지 가져오기
async function fetchMessagesFromSupabase(roomId: string): Promise<ChatMessage[]> {
  try {
    const tokenAddress = getTokenAddressFromRoomId(roomId);
    if (!tokenAddress) {
      console.error(`❌ 알 수 없는 roomId: ${roomId}`);
      return [];
    }

    const { data, error } = await supabase
      .from('message_cache')
      .select('*')
      .eq('token_address', tokenAddress)
      .order('block_time', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Supabase 메시지 조회 실패:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('📭 해당 룸에 메시지가 없습니다:', roomId);
      return [];
    }

    console.log(`✅ Supabase에서 ${data.length}개 메시지 로드됨:`, roomId);
    return data.map(msg => formatMessageFromSupabase(msg, roomId));
  } catch (error) {
    console.error('❌ 메시지 조회 실패:', error);
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
      console.error(`❌ 알 수 없는 roomId: ${roomId}`);
      return null;
    }

    // 트랜잭션 해시가 없으면 임시 생성
    const signature = messageData.tx_hash || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('📤 Supabase 저장 시도:', {
      signature,
      token_address: tokenAddress,
      sender_wallet: messageData.user_address,
      message_type: messageData.trade_type.toUpperCase(),
      content: messageData.content
    });

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
      console.error('❌ Supabase 메시지 저장 실패:', error);
      throw new Error(`Supabase 저장 실패: ${error.message} (코드: ${error.code})`);
    }

    console.log('✅ Supabase 메시지 저장 성공:', data);
    
    // 성공 시 로컬 상태에도 즉시 추가
    const newMessage = formatMessageFromSupabase(data, roomId);
    globalMessages = [...globalMessages, newMessage];
    notifyListeners();
    
    return newMessage;
  } catch (error) {
    console.error('❌ 메시지 저장 실패:', error);
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
    console.error(`❌ 실시간 구독 실패 - 알 수 없는 roomId: ${roomId}`);
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
        console.log('🔔 실시간 메시지 수신:', payload);
        const newMessage = formatMessageFromSupabase(payload.new as MessageCache, roomId);
        
        // 중복 제거
        if (!globalMessages.find(msg => msg.id === newMessage.id)) {
          globalMessages = [...globalMessages, newMessage];
          notifyListeners();
        }
      }
    )
    .subscribe((status) => {
      console.log('🔔 Realtime 구독 상태:', status);
    });
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
        console.log(`📚 메시지 로드 시작: ${roomId}`);
        globalMessages = await fetchMessagesFromSupabase(roomId);
        notifyListeners();
        setupRealtimeSubscription(roomId);
      } catch (error) {
        console.error('❌ 메시지 로드 실패:', error);
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
      console.warn('⚠️ 지갑이 연결되지 않았습니다.');
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

    console.log(`📤 Supabase로 메시지 전송:`, messageData);
    saveMessageToSupabase(roomId, messageData);
  }, [roomId, isClient, connected, publicKey]);

  const checkMyTransactions = useCallback(() => {
    if (!publicKey) {
      console.warn('⚠️ 지갑이 연결되지 않았습니다.');
      return;
    }
    console.log('📝 Supabase 실시간 시스템 활성화됨');
  }, []);

  return {
    messages,
    sendMessage,
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => 
      roomId && isClient ? addMessage(roomId, message) : null,
    addMemoFromTransaction: (signature: string) => 
      console.log(`🔍 트랜잭션 메모 (Supabase 실시간): ${signature.slice(0, 8)}...`),
    checkMyTransactions,
  };
}; 