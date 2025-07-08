'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { ChatMessage } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type MessageCache = Database['public']['Tables']['message_cache']['Row'];

// 🎯 메시지 캐시 최적화 설정
const MAX_MESSAGES_PER_ROOM = 500; // 방당 최대 메시지 수
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5분마다 정리
const MESSAGE_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24시간 보관

// 룸 ID를 토큰 주소로 변환하는 매핑
const ROOM_TOKEN_MAP: Record<string, string> = {
  'sol-usdc': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'btc-chat': 'bitcoin-token-address',
  'general': 'general-token-address'
};

function getTokenAddressFromRoomId(roomId: string): string | null {
  return ROOM_TOKEN_MAP[roomId] || null;
}

// 메시지 캐시 인터페이스
interface MessageCacheEntry {
  messages: ChatMessage[];
  lastUpdated: number;
  roomId: string;
}

// 🚀 개선된 메시지 캐시 시스템
class MessageCacheManager {
  private cache = new Map<string, MessageCacheEntry>();
  private listeners = new Map<string, Set<() => void>>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMessages();
    }, CACHE_CLEANUP_INTERVAL);
  }

  private cleanupOldMessages() {
    const now = Date.now();
    let cleanedRooms = 0;
    
    for (const [roomId, entry] of this.cache.entries()) {
      if (now - entry.lastUpdated > MESSAGE_RETENTION_TIME) {
        this.cache.delete(roomId);
        cleanedRooms++;
        continue;
      }

      if (entry.messages.length > MAX_MESSAGES_PER_ROOM) {
        entry.messages = entry.messages.slice(-MAX_MESSAGES_PER_ROOM);
        entry.lastUpdated = now;
      }
    }

    if (cleanedRooms > 0) {
    }
  }

  getMessages(roomId: string): ChatMessage[] {
    const entry = this.cache.get(roomId);
    return entry ? entry.messages : [];
  }

  setMessages(roomId: string, messages: ChatMessage[]) {
    const limitedMessages = messages.slice(-MAX_MESSAGES_PER_ROOM);
    
    this.cache.set(roomId, {
      messages: limitedMessages,
      lastUpdated: Date.now(),
      roomId
    });

    this.notifyListeners(roomId);
  }

  addMessage(roomId: string, message: ChatMessage) {
    const entry = this.cache.get(roomId);
    
    if (entry) {
      if (!entry.messages.find(msg => msg.id === message.id)) {
        entry.messages.push(message);
        
        if (entry.messages.length > MAX_MESSAGES_PER_ROOM) {
          entry.messages = entry.messages.slice(-MAX_MESSAGES_PER_ROOM);
        }
        
        entry.lastUpdated = Date.now();
        this.notifyListeners(roomId);
      }
    } else {
      this.setMessages(roomId, [message]);
    }
  }

  addListener(roomId: string, listener: () => void) {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set());
    }
    this.listeners.get(roomId)!.add(listener);

    return () => {
      const roomListeners = this.listeners.get(roomId);
      if (roomListeners) {
        roomListeners.delete(listener);
        if (roomListeners.size === 0) {
          this.listeners.delete(roomId);
        }
      }
    };
  }

  private notifyListeners(roomId: string) {
    const roomListeners = this.listeners.get(roomId);
    if (roomListeners) {
      roomListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
        }
      });
    }
  }

  getCacheStats() {
    const totalMessages = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.messages.length, 0
    );
    
    return {
      totalRooms: this.cache.size,
      totalMessages,
      totalListeners: Array.from(this.listeners.values()).reduce(
        (sum, listeners) => sum + listeners.size, 0
      )
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.listeners.clear();
  }
}

// 전역 캐시 매니저
const messageCacheManager = new MessageCacheManager();

// Supabase 메시지 변환
function formatMessageFromSupabase(messageData: MessageCache, roomId: string): ChatMessage {
  return {
    id: messageData.signature,
    userId: messageData.sender_wallet,
    userAddress: messageData.sender_wallet,
    content: messageData.content,
    timestamp: new Date(messageData.block_time),
    roomId: roomId,
    tradeType: messageData.message_type as 'buy' | 'sell',
    tradeAmount: messageData.quantity?.toString() || '',
    txHash: messageData.signature,
    nickname: `${messageData.sender_wallet.slice(0, 4)}...${messageData.sender_wallet.slice(-4)}`,
    avatar: '🚀'
  };
}

// 🎯 실시간 구독 관리자
class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, RealtimeChannel>();

  subscribe(roomId: string, onMessage: (message: ChatMessage) => void) {
    this.unsubscribe(roomId);

    const tokenAddress = getTokenAddressFromRoomId(roomId);
    if (!tokenAddress) return null;

    const channel = supabase
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
          onMessage(newMessage);
        }
      )
      .subscribe();

    this.subscriptions.set(roomId, channel);
    return channel;
  }

  unsubscribe(roomId: string) {
    const channel = this.subscriptions.get(roomId);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(roomId);
    }
  }

  unsubscribeAll() {
    for (const [roomId] of this.subscriptions) {
      this.unsubscribe(roomId);
    }
  }
}

const realtimeManager = new RealtimeSubscriptionManager();

// 🎯 최적화된 useChatMessages 훅
export function useChatMessagesOptimized(roomId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);
  
  const messages = roomId ? messageCacheManager.getMessages(roomId) : [];

  const loadMessages = useCallback(async (targetRoomId: string) => {
    if (!targetRoomId) return;

    setIsLoading(true);
    setError(null);

    try {
      const tokenAddress = getTokenAddressFromRoomId(targetRoomId);
      if (!tokenAddress) throw new Error(`알 수 없는 룸 ID: ${targetRoomId}`);

      const { data, error } = await supabase
        .from('message_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .order('block_time', { ascending: true })
        .limit(MAX_MESSAGES_PER_ROOM);

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => 
        formatMessageFromSupabase(msg, targetRoomId)
      );

      messageCacheManager.setMessages(targetRoomId, formattedMessages);

    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const removeListener = messageCacheManager.addListener(roomId, triggerUpdate);
    
    realtimeManager.subscribe(roomId, (newMessage) => {
      messageCacheManager.addMessage(roomId, newMessage);
    });

    if (messageCacheManager.getMessages(roomId).length === 0) {
      loadMessages(roomId);
    }

    return () => {
      removeListener();
      realtimeManager.unsubscribe(roomId);
    };
  }, [roomId, loadMessages, triggerUpdate]);

  return {
    messages,
    isLoading,
    error,
    refetch: () => roomId && loadMessages(roomId),
    getCacheStats: () => messageCacheManager.getCacheStats()
  };
}

export function cleanupChatMessages() {
  messageCacheManager.destroy();
  realtimeManager.unsubscribeAll();
} 