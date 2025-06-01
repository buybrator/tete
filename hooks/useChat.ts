'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatRoom, ChatMessage } from '@/types';

export function useChat() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket 연결 (실시간 메시지)
  const ws = useRef<WebSocket | null>(null);

  // 채팅방 목록 조회
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: 실제 API 호출
      // const response = await fetch('/api/rooms');
      // const data: ApiResponse<ChatRoom[]> = await response.json();

      // Mock 데이터
      const mockRooms: ChatRoom[] = [
        {
          id: 'sol-usdc',
          name: 'SOL/USDC',
          description: 'SOL/USDC 거래 채팅방',
          image: '💰',
          tokenAddress: 'So11111111111111111111111111111111111111112',
          createdBy: 'user1',
          memberCount: 1234,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bonk',
          name: 'BONK',
          description: 'BONK 거래 채팅방',
          image: '🐕',
          tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          createdBy: 'user2',
          memberCount: 567,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setRooms(mockRooms);
      if (mockRooms.length > 0 && !activeRoomId) {
        setActiveRoomId(mockRooms[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 목록을 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [activeRoomId]);

  // 특정 채팅방 메시지 조회
  const fetchMessages = useCallback(async (roomId: string, page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: 실제 API 호출
      // const response = await fetch(`/api/rooms/${roomId}/messages?page=${page}`);
      // const data: ApiResponse<PaginatedResponse<ChatMessage>> = await response.json();

      // Mock 메시지
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          roomId,
          userId: 'user1',
          userAddress: '0xabc...def',
          nickname: 'Trader123',
          avatar: '',
          content: 'Going long here 🚀',
          tradeType: 'buy',
          tradeAmount: '2.3 SOL',
          timestamp: new Date(Date.now() - 300000), // 5분 전
        },
        {
          id: '2',
          roomId,
          userId: 'user2',
          userAddress: '0xdef...abc',
          nickname: 'CryptoKing',
          avatar: '',
          content: 'Taking profit, gl all',
          tradeType: 'sell',
          tradeAmount: '30%',
          timestamp: new Date(Date.now() - 120000), // 2분 전
        },
      ];

      setMessages(prev => ({
        ...prev,
        [roomId]: page === 1 ? mockMessages : [...(prev[roomId] || []), ...mockMessages],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지를 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(async (roomId: string, content: string, tradeType: 'buy' | 'sell', tradeAmount?: string) => {
    setError(null);

    try {
      // TODO: 실제 API 호출
      // const response = await fetch(`/api/rooms/${roomId}/messages`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content, tradeType, tradeAmount }),
      // });

      // Mock 메시지 전송
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        roomId,
        userId: 'current-user',
        userAddress: '0xabc...def',
        nickname: 'Me',
        avatar: '',
        content,
        tradeType,
        tradeAmount,
        timestamp: new Date(),
      };

      setMessages(prev => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), newMessage],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.');
      throw err;
    }
  }, []);

  // 채팅방 생성
  const createRoom = useCallback(async (name: string, description?: string, tokenAddress?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: 실제 API 호출
      const newRoom: ChatRoom = {
        id: Date.now().toString(),
        name,
        description,
        image: '🎯',
        tokenAddress,
        createdBy: 'current-user',
        memberCount: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setRooms(prev => [...prev, newRoom]);
      setActiveRoomId(newRoom.id);
      
      return newRoom;
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
      // TODO: 실제 검색 API 호출
      return rooms.filter(room => 
        room.name.toLowerCase().includes(query.toLowerCase()) ||
        room.description?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 검색에 실패했습니다.');
      return [];
    }
  }, [rooms]);

  // WebSocket 연결 설정
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // TODO: 실제 WebSocket URL
      // ws.current = new WebSocket('ws://localhost:3001');
      
      // ws.current.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   if (data.type === 'NEW_MESSAGE') {
      //     const message = data.payload as ChatMessage;
      //     setMessages(prev => ({
      //       ...prev,
      //       [message.roomId]: [...(prev[message.roomId] || []), message],
      //     }));
      //   }
      // };
    } catch (err) {
      console.error('WebSocket 연결 실패:', err);
    }
  }, []);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchRooms();
    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, [fetchRooms, connectWebSocket]);

  // 활성 채팅방 변경 시 메시지 로드
  useEffect(() => {
    if (activeRoomId && !messages[activeRoomId]) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId, messages, fetchMessages]);

  return {
    rooms,
    activeRoomId,
    activeRoom: rooms.find(room => room.id === activeRoomId),
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