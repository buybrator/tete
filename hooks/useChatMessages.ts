import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  roomId: string;
  userAddress: string;
  avatar: string;
  tradeType: 'buy' | 'sell';
  amount: string;
  message: string;
  timestamp: Date;
}

// 글로벌 메시지 스토어 (실제로는 상태 관리 라이브러리나 WebSocket을 사용)
let globalMessages: ChatMessage[] = [];

// 클라이언트에서만 초기 메시지 로드
if (typeof window !== 'undefined') {
  globalMessages = [
    {
      id: '1',
      roomId: 'sol-usdc',
      userAddress: '0xabc...def',
      avatar: '',
      tradeType: 'buy',
      amount: '2.3 SOL',
      message: 'Going long here 🚀',
      timestamp: new Date(),
    },
    {
      id: '2', 
      roomId: 'sol-usdc',
      userAddress: '0xdef...abc',
      avatar: '',
      tradeType: 'sell',
      amount: '30%',
      message: 'Taking profit, gl all',
      timestamp: new Date(),
    },
  ];
}

let messageIdCounter = 3;
const messageListeners = new Set<() => void>();

// 새 메시지 추가 함수
export const addMessage = (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => {
  const newMessage: ChatMessage = {
    ...message,
    id: String(messageIdCounter++),
    timestamp: new Date(),
    roomId,
  };
  
  globalMessages = [...globalMessages, newMessage];
  
  // 모든 리스너에게 업데이트 알림
  messageListeners.forEach(listener => listener());
};

// 메시지 리스트 가져오기
export const getMessages = () => globalMessages;

// 특정 채팅방 메시지 가져오기
export const getRoomMessages = (roomId: string) => 
  globalMessages.filter(msg => msg.roomId === roomId);

export const useChatMessages = (roomId?: string) => {
  // 초기 상태를 빈 배열로 설정하여 hydration mismatch 방지
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isClient, setIsClient] = useState(false);

  const updateMessages = useCallback(() => {
    if (!isClient) return;
    const newMessages = roomId ? getRoomMessages(roomId) : getMessages();
    setMessages(newMessages);
  }, [roomId, isClient]);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // 초기 메시지 로드
    updateMessages();

    // 리스너 등록
    messageListeners.add(updateMessages);

    // 정리
    return () => {
      messageListeners.delete(updateMessages);
    };
  }, [updateMessages, isClient]);

  // 메시지 전송 함수
  const sendMessage = useCallback((content: string, tradeType: 'buy' | 'sell' = 'buy', amount: string = '') => {
    if (!roomId || !isClient) return;

    // 실제로는 여기서 API 호출
    addMessage(roomId, {
      userAddress: '0x123...abc', // 실제로는 연결된 지갑 주소
      avatar: '',
      tradeType,
      amount,
      message: content,
    });
  }, [roomId, isClient]);

  return {
    messages,
    sendMessage,
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => 
      roomId && isClient ? addMessage(roomId, message) : null,
  };
}; 