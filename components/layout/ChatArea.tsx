'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import ChatBubble from '@/components/layout/ChatBubble';
import ChatInput from '@/components/layout/ChatInput';
import { useChatMessages } from '@/hooks/useChatMessages';

// 채팅방 데이터 타입 정의 (백엔드 연동 고려)
interface ChatRoom {
  id: string;
  name: string;
  image: string;
  lastMessage?: string;
  unreadCount?: number;
}

// Mock 채팅방 데이터
const mockRooms: ChatRoom[] = [
  { id: 'sol-usdc', name: 'SOL/USDC', image: '💰' },
  { id: 'bonk', name: 'BONK', image: '🐕' },
  { id: 'wif', name: 'WIF', image: '🧢' },
];

export default function ChatArea() {
  const [isPopupMode, setIsPopupMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(mockRooms[0].id);
  const [isClient, setIsClient] = useState(false);
  const { messages: roomMessages } = useChatMessages(selectedRoom);
  const desktopChatMessagesRef = useRef<HTMLDivElement>(null);
  const mobileChatMessagesRef = useRef<HTMLDivElement>(null);

  // 스크롤을 맨 아래로 이동하는 함수 (디버깅 포함)
  const scrollToBottom = () => {
    // 현재 화면 크기에 따라 적절한 ref 선택
    const isDesktop = window.innerWidth >= 1024;
    const element = isDesktop ? desktopChatMessagesRef.current : mobileChatMessagesRef.current;
    
    if (element) {
      console.log(`스크롤 전 (${isDesktop ? '데스크톱' : '모바일'}):`, {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight
      });
      
      // 강제로 스크롤을 맨 아래로
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'instant'
      });
      
      console.log(`스크롤 후 (${isDesktop ? '데스크톱' : '모바일'}):`, {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight
      });
    } else {
      console.error('chatMessagesRef.current가 null입니다!');
    }
  };

  // 새 메시지가 추가될 때마다 무조건 맨 아래로 스크롤
  useEffect(() => {
    if (roomMessages.length > 0) {
      // 여러 타이밍에 스크롤 시도
      scrollToBottom();
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
    }
  }, [roomMessages]);

  // 채팅방 변경 시 스크롤
  useEffect(() => {
    if (isClient) {
      scrollToBottom();
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 500);
    }
  }, [selectedRoom, isClient]);

  // 컴포넌트 마운트 시 맨 아래로 스크롤 - 의존성 배열 수정
  useEffect(() => {
    if (isClient && roomMessages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    }
  }, [isClient, roomMessages.length]);

  // 클라이언트 사이드에서만 실행되는 초기화
  useEffect(() => {
    setIsClient(true);
    
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const popup = urlParams.get('popup') === 'true';
    const room = urlParams.get('room');
    
    setIsPopupMode(popup);
    
    if (room) {
      setSelectedRoom(room);
    }

    // Navbar에서 채팅방 선택 이벤트 리스너
    const handleRoomSelected = (event: CustomEvent) => {
      const { roomId } = event.detail;
      if (roomId && mockRooms.find(r => r.id === roomId)) {
        setSelectedRoom(roomId);
        console.log('ChatArea: 채팅방 전환됨 ->', roomId);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('roomSelected', handleRoomSelected as EventListener);

    // 정리
    return () => {
      window.removeEventListener('roomSelected', handleRoomSelected as EventListener);
    };
  }, []);

  // 디버깅을 위한 전역 함수 추가
  useEffect(() => {
    // 전역 window 객체에 테스트 함수 추가
    const windowWithDebug = window as Window & {
      testScroll?: () => void;
      checkChatArea?: () => void;
    };
    
    windowWithDebug.testScroll = () => {
      console.log('테스트 스크롤 실행');
      scrollToBottom();
    };
    
    windowWithDebug.checkChatArea = () => {
      const element = desktopChatMessagesRef.current || mobileChatMessagesRef.current;
      if (element) {
        // DOM 요소의 실제 클래스와 부모 요소 확인
        console.log('ChatArea DOM 정보:', {
          ref요소: element,
          클래스명: element.className,
          부모요소: element.parentElement,
          자식개수: element.children.length,
          실제높이: element.offsetHeight,
          스크롤높이: element.scrollHeight,
          계산된높이: window.getComputedStyle(element).height,
          overflow: window.getComputedStyle(element).overflow,
          overflowY: window.getComputedStyle(element).overflowY,
          display: window.getComputedStyle(element).display
        });
        
        // 모든 chat-messages 클래스를 가진 요소 찾기
        const allChatMessages = document.querySelectorAll('.chat-messages');
        console.log('모든 chat-messages 요소:', allChatMessages.length, allChatMessages);
      } else {
        console.error('chatMessagesRef가 null입니다!');
      }
    };
    
    return () => {
      delete windowWithDebug.testScroll;
      delete windowWithDebug.checkChatArea;
    };
  }, []);

  // 새 브라우저 창에서 팝업 모드로 열기
  const openBrowserPopup = (roomId: string) => {
    const room = mockRooms.find(r => r.id === roomId);
    if (!room) return;

    console.log('브라우저 팝업 열기:', roomId, room.name);
    
    // 새 브라우저 창 열기
    const popupWindow = window.open(
      `${window.location.origin}?popup=true&room=${roomId}`,
      `chat-popup-${roomId}`,
      'width=400,height=600,resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no,location=no'
    );

    if (popupWindow) {
      console.log('팝업 창이 성공적으로 열렸습니다');
      // 팝업 창에 포커스
      popupWindow.focus();
    } else {
      console.error('팝업 차단으로 인해 창을 열 수 없습니다');
      alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
    }
  };

  // 클라이언트 로딩 중에는 기본 레이아웃만 렌더링
  if (!isClient) {
    return (
      <div className="desktop-chat-area lg:flex hidden">
        {/* Chat Room Tabs */}
        <div className="chat-tabs">
          <div className="grid grid-cols-3 w-full">
            {mockRooms.map((room) => (
              <div key={room.id} className="relative">
                <button
                  onClick={() => setSelectedRoom(room.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 text-sm w-full h-full transition-all duration-200 font-semibold ${
                    selectedRoom === room.id 
                      ? 'text-white bg-blue-500 hover:bg-blue-600' 
                      : 'text-gray-600 bg-transparent hover:bg-gray-100'
                  }`}
                  style={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                >
                  <span className="text-base">{room.image}</span>
                  <span className="font-semibold text-xs">{room.name}</span>
                </button>
                
                {/* 팝업 모드 버튼 */}
                <div className="flex absolute top-1 right-1">
                  <button 
                    className="p-1 hover:bg-gray-200 rounded transition-colors opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBrowserPopup(room.id);
                    }}
                    title="새 창에서 채팅 열기"
                    style={{ boxShadow: 'none' }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="chat-messages">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>로딩 중...</p>
          </div>
        </div>
        <div className="chat-input-area">
          <ChatInput roomId={selectedRoom} />
        </div>
      </div>
    );
  }

  // 팝업 모드일 때는 채팅 영역과 인풋만 렌더링
  if (isPopupMode) {
    const currentRoom = mockRooms.find(r => r.id === selectedRoom);
    
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* 팝업 헤더 */}
        <div className="flex items-center gap-2 p-3 border-b-2 border-border bg-main text-main-foreground">
          <span className="text-lg">{currentRoom?.image}</span>
          <span className="font-bold">{currentRoom?.name}</span>
        </div>

        {/* 메시지 영역 */}
        <div 
          ref={mobileChatMessagesRef}
          className="flex-1 p-3 overflow-y-auto bg-white"
          style={{
            background: `
              linear-gradient(90deg, #E5E5E5 1px, transparent 1px),
              linear-gradient(180deg, #E5E5E5 1px, transparent 1px),
              oklch(95.38% 0.0357 72.89)
            `,
            backgroundSize: '90px 90px',
            display: 'block',
            minHeight: 0,
            overflowAnchor: 'none'
          }}
        >
          {roomMessages.length > 0 ? (
            roomMessages.map((message, index) => (
              <div key={message.id} style={{ marginBottom: index === roomMessages.length - 1 ? 0 : '0.75rem' }}>
                <ChatBubble
                  side={message.tradeType}
                  avatar={message.avatar}
                  amount={message.amount}
                  message={message.message}
                  userAddress={message.userAddress}
                  timestamp={message.timestamp}
                />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>채팅방에 메시지가 없습니다. 첫 메시지를 작성해보세요!</p>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t-2 border-border bg-background">
          <ChatInput roomId={selectedRoom} />
        </div>
      </div>
    );
  }

  const chatAreaContent = (messagesRef: React.RefObject<HTMLDivElement | null>) => (
    <>
      {/* Chat Room Tabs */}
      <div className="chat-tabs">
        <div className="grid grid-cols-3 w-full">
          {mockRooms.map((room) => (
            <div key={room.id} className="relative">
              <button
                onClick={() => setSelectedRoom(room.id)}
                className={`flex items-center justify-center gap-2 px-3 py-3 text-sm w-full h-full transition-all duration-200 font-semibold ${
                  selectedRoom === room.id 
                    ? 'text-white bg-blue-500 hover:bg-blue-600' 
                    : 'text-gray-600 bg-transparent hover:bg-gray-100'
                }`}
                style={{ boxShadow: 'none', outline: 'none', border: 'none' }}
              >
                <span className="text-base">{room.image}</span>
                <span className="font-semibold text-xs">{room.name}</span>
              </button>
              
              {/* 팝업 모드 버튼 */}
              <div className="flex absolute top-1 right-1">
                <button 
                  className="p-1 hover:bg-gray-200 rounded transition-colors opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    openBrowserPopup(room.id);
                  }}
                  title="새 창에서 채팅 열기"
                  style={{ boxShadow: 'none' }}
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesRef}
        className="chat-messages"
        style={{
          background: `
            linear-gradient(90deg, #E5E5E5 1px, transparent 1px),
            linear-gradient(180deg, #E5E5E5 1px, transparent 1px),
            oklch(95.38% 0.0357 72.89)
          `,
          backgroundSize: '90px 90px'
        }}
      >
        {roomMessages.length > 0 ? (
          roomMessages.map((message, index) => (
            <div key={message.id} style={{ marginBottom: index === roomMessages.length - 1 ? 0 : '0.75rem' }}>
              <ChatBubble
                side={message.tradeType}
                avatar={message.avatar}
                amount={message.amount}
                message={message.message}
                userAddress={message.userAddress}
                timestamp={message.timestamp}
              />
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>채팅방에 메시지가 없습니다. 첫 메시지를 작성해보세요!</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <ChatInput roomId={selectedRoom} />
      </div>
    </>
  );

  return (
    <>
      <div className="desktop-chat-area hidden lg:flex">
        {chatAreaContent(desktopChatMessagesRef)}
      </div>
      <div className="mobile-chat-area flex lg:hidden">
        {chatAreaContent(mobileChatMessagesRef)}
      </div>
    </>
  );
} 