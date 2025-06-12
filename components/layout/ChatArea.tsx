'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import ChatBubble from '@/components/layout/ChatBubble';
import ChatInput from '@/components/layout/ChatInput';
import TokenAvatar from '@/components/ui/TokenAvatar';
import { useChatMessages } from '@/hooks/useChatMessages';

// 채팅방 데이터 타입 정의 (백엔드 연동 고려)
interface ChatRoom {
  id: string;
  name: string;
  image: string;
  contractAddress: string;
  lastMessage?: string;
  unreadCount?: number;
}

// API에서 받아오는 채팅방 타입
interface ApiChatRoom {
  id: string;
  name: string;
  contractAddress: string;
  creatorAddress: string;
  transactionSignature: string;
  createdAt: string;
  isActive: boolean;
  image?: string; // 토큰 메타데이터에서 가져온 이미지 URL
}

export default function ChatArea() {
  const [isPopupMode, setIsPopupMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [mobile, setMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 채팅 메시지 hooks
  const { messages } = useChatMessages(selectedRoom);

  // 화면 크기 체크
  useEffect(() => {
    const checkMobile = () => {
      setMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // URL 파라미터로 팝업 모드인지 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const popup = urlParams.get('popup') === 'true';
    setIsPopupMode(popup);
  }, []);

  // 실제 채팅방 데이터 로드
  const loadChatrooms = useCallback(async () => {
    try {
      console.log('🏠 채팅방 목록 로딩 시작 (ChatArea)...');
      const response = await fetch('/api/chatrooms');
      const data = await response.json();
      
      console.log('🏠 ChatArea API 응답:', data);
      
      if (data.success && data.chatrooms) {
        // API 데이터를 UI 형식으로 변환
        const formattedRooms: ChatRoom[] = data.chatrooms.map((room: ApiChatRoom) => ({
          id: room.contractAddress,
          name: room.name,
          image: room.image || '🪙', // 토큰 이미지 URL 또는 기본 이모지
          contractAddress: room.contractAddress
        }));
        
        console.log('🏠 ChatArea 포맷된 채팅방:', formattedRooms);
        setChatRooms(formattedRooms);
        
        // 기본 선택 채팅방 설정 (첫 번째 방)
        if (formattedRooms.length > 0 && !selectedRoom) {
          const firstRoom = formattedRooms[0];
          setSelectedRoom(firstRoom.id);
          
          // 토큰 쌍 변경 이벤트
          window.dispatchEvent(new CustomEvent('tokenPairChanged', {
            detail: { 
              contractAddress: firstRoom.contractAddress,
              tokenName: firstRoom.name 
            }
          }));
        }
      } else {
        setChatRooms([]);
      }
    } catch (error) {
      console.error('❌ ChatArea 채팅방 로드 오류:', error);
      setChatRooms([]);
    }
  }, [selectedRoom]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadChatrooms();
  }, [loadChatrooms]);

  // 새 채팅방 생성 이벤트 리스너
  useEffect(() => {
    const handleChatroomCreated = (event: CustomEvent) => {
      loadChatrooms(); // 새 채팅방 생성 시 목록 새로고침
      
      // 새로 생성된 채팅방으로 자동 전환
      if (event.detail?.chatroom?.contractAddress) {
        setSelectedRoom(event.detail.chatroom.contractAddress);
        window.dispatchEvent(new CustomEvent('tokenPairChanged', {
          detail: { 
            contractAddress: event.detail.chatroom.contractAddress,
            tokenName: event.detail.chatroom.name 
          }
        }));
      }
    };

    window.addEventListener('chatroomCreated', handleChatroomCreated as EventListener);
    return () => window.removeEventListener('chatroomCreated', handleChatroomCreated as EventListener);
  }, [loadChatrooms]);

  // 외부에서 채팅방 선택 이벤트 처리
  useEffect(() => {
    const handleRoomSelected = (event: CustomEvent) => {
      const { roomId } = event.detail;
      if (roomId && roomId !== selectedRoom) {
        setSelectedRoom(roomId);
        
        // 토큰 쌍 변경 이벤트
        const room = chatRooms.find(r => r.id === roomId);
        if (room) {
          window.dispatchEvent(new CustomEvent('tokenPairChanged', {
            detail: { 
              contractAddress: room.contractAddress,
              tokenName: room.name 
            }
          }));
        }
      }
    };

    window.addEventListener('roomSelected', handleRoomSelected as EventListener);
    return () => window.removeEventListener('roomSelected', handleRoomSelected as EventListener);
  }, [selectedRoom, chatRooms]);

  // 메시지 스크롤 관리
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 메시지 전송은 ChatInput에서 직접 처리하므로 제거

  // 채팅방 정보 렌더링
  const renderChatRoomInfo = () => {
    const currentRoom = chatRooms.find(room => room.id === selectedRoom);
    
    if (!currentRoom) return null;

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b-2 border-black">
        <div className="flex items-center space-x-3">
          <TokenAvatar 
            tokenAddress={currentRoom.contractAddress}
            tokenName={currentRoom.name}
            size="md"
            imageUrl={currentRoom.image}
          />
          <span className="text-xs text-gray-500">({currentRoom.contractAddress.slice(0, 4)}...{currentRoom.contractAddress.slice(-4)})</span>
          <div>
            <h3 className="font-bold text-sm">{currentRoom.name}</h3>
            <p className="text-xs text-gray-600">CA: {currentRoom.contractAddress.slice(0, 8)}...</p>
          </div>
        </div>
        <button 
          onClick={() => window.open(`https://solscan.io/token/${currentRoom.contractAddress}`, '_blank')}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          title="Solscan에서 보기"
        >
          <ExternalLink size={16} />
        </button>
      </div>
    );
  };

  // 채팅 메시지 영역 렌더링
  const renderChatMessages = () => {
    if (!selectedRoom) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <span>채팅방을 선택해주세요</span>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <span>아직 메시지가 없습니다. 첫 메시지를 보내보세요!</span>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  // 채팅 입력 영역
  const renderChatInput = () => {
    return (
      <div className="border-t-2 border-black bg-white">
                 <ChatInput 
           roomId={selectedRoom || ''}
         />
      </div>
    );
  };

  // 전체 채팅 영역 컴포넌트
  const ChatAreaBody = (
    <div className="flex flex-col h-full bg-white border-2 border-black rounded-base shadow-base overflow-hidden">
      {/* 채팅방 정보 */}
      {renderChatRoomInfo()}
      
      {/* 채팅 메시지 */}
      {renderChatMessages()}
      
      {/* 채팅 입력 */}
      {renderChatInput()}
    </div>
  );

  // 팝업 모드일 때
  if (isPopupMode) {
    return (
      <div className="h-screen w-screen bg-[#f5f5dc] p-4">
        {ChatAreaBody}
      </div>
    );
  }

  // 일반 모드 - 중복 스타일 제거
  return mobile ? (
    <div className="mobile-chat-area">
      <div className="flex flex-col h-full bg-white border-2 border-black rounded-base shadow-base overflow-hidden">
        {/* 채팅방 정보 */}
        {renderChatRoomInfo()}
        
        {/* 채팅 메시지 */}
        {renderChatMessages()}
        
        {/* 채팅 입력 */}
        {renderChatInput()}
      </div>
    </div>
  ) : (
    <div className="desktop-chat-area">
      <div className="flex flex-col h-full bg-white border-2 border-black rounded-base shadow-base overflow-hidden">
        {/* 채팅방 정보 */}
        {renderChatRoomInfo()}
        
        {/* 채팅 메시지 */}
        {renderChatMessages()}
        
        {/* 채팅 입력 */}
        {renderChatInput()}
      </div>
    </div>
  );
} 