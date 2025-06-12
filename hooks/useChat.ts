'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatRoom, ChatMessage } from '@/types';

export function useChat() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket 연결은 useChatMessages에서 관리
  const ws = useRef<WebSocket | null>(null);

  // 채팅방 목록 조회
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/api/chat/rooms`);
      const result = await response.json();
      
      if (result.success) {
        // 서버 데이터를 클라이언트 형식으로 변환
        const formattedRooms: ChatRoom[] = result.data.map((room: any) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          image: room.image,
          tokenAddress: room.token_address,
          createdBy: room.created_by,
          memberCount: room.member_count,
          lastMessage: room.last_message ? {
            id: room.last_message.id,
            roomId: room.id,
            userId: room.last_message.user_address?.slice(0, 8) || 'unknown',
            userAddress: room.last_message.user_address,
            content: room.last_message.content,
            tradeType: room.last_message.trade_type,
            timestamp: new Date(room.last_message.created_at)
          } : undefined,
          isActive: room.is_active,
          createdAt: new Date(room.created_at),
          updatedAt: new Date(room.updated_at),
        }));

        setRooms(formattedRooms);
        
        // 기본 선택 채팅방 설정 (기존 UI 호환성)
        if (formattedRooms.length > 0 && !activeRoomId) {
          const defaultRoom = formattedRooms.find(r => r.name === 'SOL/USDC') || formattedRooms[0];
          const roomKey = defaultRoom.name === 'SOL/USDC' ? 'sol-usdc' : 
                          defaultRoom.name === 'BTC Discussion' ? 'btc-chat' : 
                          'general';
          setActiveRoomId(roomKey);
        }
      } else {
        setError('채팅방 목록을 가져오는데 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 목록을 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [activeRoomId]);

  // 특정 채팅방 메시지 조회 (useChatMessages에서 관리하므로 간소화)
  const fetchMessages = useCallback(async (roomId: string, page = 1) => {
    // useChatMessages에서 직접 관리하므로 여기서는 처리하지 않음
    console.log(`📨 메시지 조회는 useChatMessages에서 관리됨: ${roomId}`);
  }, []);

  // 메시지 전송 (useChatMessages에서 관리)
  const sendMessage = useCallback(async (roomId: string, content: string, tradeType: 'buy' | 'sell', tradeAmount?: string) => {
    // useChatMessages에서 직접 관리하므로 여기서는 처리하지 않음
    console.log(`📤 메시지 전송은 useChatMessages에서 관리됨: ${roomId}`);
  }, []);

  // 채팅방 생성
  const createRoom = useCallback(async (name: string, description?: string, tokenAddress?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/api/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          token_address: tokenAddress,
          created_by: 'current-user', // 실제로는 인증된 사용자 ID
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const newRoom: ChatRoom = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          image: result.data.image,
          tokenAddress: result.data.token_address,
          createdBy: result.data.created_by,
          memberCount: result.data.member_count,
          isActive: result.data.is_active,
          createdAt: new Date(result.data.created_at),
          updatedAt: new Date(result.data.updated_at),
        };

        setRooms(prev => [...prev, newRoom]);
        setActiveRoomId(newRoom.id);
        
        return newRoom;
      } else {
        throw new Error(result.error || '채팅방 생성에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 생성에 실패했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 채팅방 검색
  const searchRooms = useCallback(async (query: string) => {
    if (!query.trim()) return rooms;

    try {
      // 로컬 필터링 (실제로는 서버 검색 API 사용)
      return rooms.filter(room => 
        room.name.toLowerCase().includes(query.toLowerCase()) ||
        room.description?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 검색에 실패했습니다.');
      return [];
    }
  }, [rooms]);

  // WebSocket 연결 설정 (useChatMessages에서 관리하므로 비활성화)
  const connectWebSocket = useCallback(() => {
    // Socket.IO는 useChatMessages에서 관리
    console.log('🔌 WebSocket 연결은 useChatMessages에서 관리됩니다');
  }, []);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchRooms();
    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, [fetchRooms, connectWebSocket]);

  // 활성 채팅방 변경 시 메시지 로드 (useChatMessages에서 관리)
  useEffect(() => {
    if (activeRoomId && !messages[activeRoomId]) {
      // useChatMessages에서 자동으로 처리됨
      console.log(`🔄 채팅방 변경: ${activeRoomId}`);
    }
  }, [activeRoomId, messages]);

  return {
    rooms,
    activeRoomId,
    activeRoom: rooms.find(room => {
      // roomId 매핑 (기존 UI 호환성)
      const roomKey = room.name === 'SOL/USDC' ? 'sol-usdc' : 
                      room.name === 'BTC Discussion' ? 'btc-chat' : 
                      'general';
      return roomKey === activeRoomId;
    }),
    messages: messages[activeRoomId] || [],
    isLoading,
    error,
    setActiveRoomId,
    fetchRooms,
    fetchMessages,
    sendMessage,
    createRoom,
    searchRooms,
    clearError: () => setError(null),
  };
} 