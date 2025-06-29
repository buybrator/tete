'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Copy } from 'lucide-react';
import ChatBubble from '@/components/layout/ChatBubble';
import ChatInput from '@/components/layout/ChatInput';
import TokenAvatar from '@/components/ui/TokenAvatar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [popupRoomId, setPopupRoomId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 채팅 메시지 hooks
  const { messages } = useChatMessages(selectedRoom);



  // URL 파라미터로 팝업 모드인지 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const popup = urlParams.get('popup') === 'true';
    const roomParam = urlParams.get('room');
    
    setIsPopupMode(popup);
    
    // 팝업 모드이고 특정 방이 지정된 경우
    if (popup && roomParam) {
      console.log('🎯 팝업 모드: 지정된 채팅방 ID:', roomParam);
      setPopupRoomId(roomParam);
    }
  }, []); // 의존성 배열을 빈 배열로 유지하여 마운트 시에만 실행

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
        
        // 팝업 모드이고 지정된 방이 있는 경우
        if (isPopupMode && popupRoomId) {
          const targetRoom = formattedRooms.find(room => room.contractAddress === popupRoomId);
          if (targetRoom) {
            console.log('🎯 팝업 모드: 채팅방 찾음:', targetRoom);
            setSelectedRoom(targetRoom.id);
            
            // 토큰 쌍 변경 이벤트
            window.dispatchEvent(new CustomEvent('tokenPairChanged', {
              detail: { 
                contractAddress: targetRoom.contractAddress,
                tokenName: targetRoom.name 
              }
            }));
          } else {
            console.warn('⚠️ 팝업 모드: 지정된 채팅방을 찾을 수 없음:', popupRoomId);
          }
        } 
        // 팝업 모드가 아닐 때만 기본 선택 채팅방 설정
        else if (!isPopupMode && formattedRooms.length > 0 && !selectedRoom) {
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
  }, [selectedRoom, isPopupMode, popupRoomId]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadChatrooms();
  }, [loadChatrooms]);

  // 새 채팅방 생성 이벤트 리스너
  useEffect(() => {
    const handleChatroomCreated = (event: CustomEvent) => {
      loadChatrooms(); // 새 채팅방 생성 시 목록 새로고침
      
      // 팝업 모드가 아닐 때만 새로 생성된 채팅방으로 자동 전환
      if (!isPopupMode && event.detail?.chatroom?.contractAddress) {
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
  }, [loadChatrooms, isPopupMode]);

  // 외부에서 채팅방 선택 이벤트 처리
  useEffect(() => {
    const handleRoomSelected = (event: CustomEvent) => {
      // 팝업 모드에서는 방 변경 무시
      if (isPopupMode) return;
      
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
  }, [selectedRoom, chatRooms, isPopupMode]);

  // 메시지 스크롤 관리
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 메시지 전송은 ChatInput에서 직접 처리하므로 제거

  // 클립보드 복사 함수
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("CA 주소가 복사되었습니다");
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      toast.error("복사에 실패했습니다");
    }
  };

  // 채팅방 정보 렌더링
  const renderChatRoomInfo = () => {
    const currentRoom = chatRooms.find(room => room.id === selectedRoom);
    
    if (!currentRoom) return null;

    // 팝업 모드일 때는 간소화된 헤더
    if (isPopupMode) {
      return (
        <div className="flex items-center justify-between p-2 bg-[oklch(25%_0_0)] border-b border-[oklch(0%_0_0)] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] relative z-10">
          <div className="flex items-center space-x-2">
            <TokenAvatar 
              tokenAddress={currentRoom.contractAddress}
              tokenName={currentRoom.name}
              size="sm"
              imageUrl={currentRoom.image}
            />
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm text-[oklch(0.9249_0_0)]">{currentRoom.name}</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[oklch(0.9249_0_0)]">
                  ({currentRoom.contractAddress.slice(0, 4)}...{currentRoom.contractAddress.slice(-4)})
                </span>
                <button 
                  onClick={() => copyToClipboard(currentRoom.contractAddress)}
                  className="p-1 hover:bg-[oklch(0.2393_0_0)] rounded-none transition-all bg-[oklch(0.2393_0_0)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                  title="CA 주소 복사"
                >
                  <Copy size={10} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 bg-[oklch(25%_0_0)] border-b-2 border-[oklch(0%_0_0)] shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] relative z-10">
        <div className="flex items-center space-x-3">
          <TokenAvatar 
            tokenAddress={currentRoom.contractAddress}
            tokenName={currentRoom.name}
            size="md"
            imageUrl={currentRoom.image}
          />
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-[oklch(0.9249_0_0)]">{currentRoom.name}</h3>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[oklch(0.9249_0_0)]">
                ({currentRoom.contractAddress.slice(0, 4)}...{currentRoom.contractAddress.slice(-4)})
              </span>
              <button 
                onClick={() => copyToClipboard(currentRoom.contractAddress)}
                className="p-1 hover:bg-[oklch(0.2393_0_0)] rounded-none transition-all bg-[oklch(0.2393_0_0)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                title="CA 주소 복사"
              >
                <Copy size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
                      <button 
              onClick={() => {
                const baseUrl = window.location.origin;
                const popupUrl = `${baseUrl}/?popup=true&room=${currentRoom.contractAddress}`;
                const width = 400;
                const height = 600;
                const left = window.screen.width - width - 50;
                const top = 50;
                window.open(
                  popupUrl, 
                  'ChatPopup', 
                  `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
                );
              }}
              className="p-2 hover:bg-[oklch(0.2393_0_0)] rounded-none transition-all bg-[oklch(0.2393_0_0)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              title="OBS 채팅창 팝업"
            >
              <MessageSquare size={16} className="text-white" />
            </button>
        </div>
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
      <div 
        className={cn(
          "flex-1 overflow-y-scroll p-4 space-y-3",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,rgba(228,228,231,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(228,228,231,0.1)_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,rgba(38,38,38,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(38,38,38,0.1)_1px,transparent_1px)]",
          "[&::-webkit-scrollbar]:w-6",
          "[&::-webkit-scrollbar]:block",
          "[&::-webkit-scrollbar-track]:bg-[#1f1f1f]",
          "[&::-webkit-scrollbar-track]:border-l-4",
          "[&::-webkit-scrollbar-track]:border-l-black",
          "[&::-webkit-scrollbar-thumb]:bg-[#e6e6e6]",
          "[&::-webkit-scrollbar-thumb]:border-l-4",
          "[&::-webkit-scrollbar-thumb]:border-l-black"
        )}
        ref={chatContainerRef}
      >
        <div>
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
      </div>
    );
  };

  // 채팅 입력 영역
  const renderChatInput = () => {
    // 팝업 모드일 때는 입력창 제거 (OBS 브라우저 소스용)
    if (isPopupMode) {
      return null;
    }

    return (
      <div className="border-t-2 border-black bg-[oklch(23.93%_0_0)]">
        <ChatInput 
          roomId={selectedRoom || ''}
        />
      </div>
    );
  };

  // 팝업 모드일 때
  if (isPopupMode) {
    return (
      <div className="h-screen w-screen bg-transparent">
        <div className="flex flex-col h-full bg-[oklch(23.93%_0_0)] backdrop-blur-sm overflow-hidden">
          {/* 채팅방 정보 - 간소화 */}
          {renderChatRoomInfo()}
          
          {/* 채팅 메시지 - 스타일 조정 */}
          <div 
            className={cn(
              "flex-1 overflow-y-scroll p-3 space-y-2",
              "[background-size:40px_40px]",
              "[background-image:linear-gradient(to_right,rgba(228,228,231,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(228,228,231,0.05)_1px,transparent_1px)]",
              "dark:[background-image:linear-gradient(to_right,rgba(38,38,38,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(38,38,38,0.05)_1px,transparent_1px)]",
              "[&::-webkit-scrollbar]:w-6",
              "[&::-webkit-scrollbar]:block",
              "[&::-webkit-scrollbar-track]:bg-[#1f1f1f]",
              "[&::-webkit-scrollbar-track]:border-l-4",
              "[&::-webkit-scrollbar-track]:border-l-black",
              "[&::-webkit-scrollbar-thumb]:bg-[#e6e6e6]",
              "[&::-webkit-scrollbar-thumb]:border-l-4",
              "[&::-webkit-scrollbar-thumb]:border-l-black"
            )}
            ref={chatContainerRef}
          >
            <div>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  <span>메시지를 기다리는 중...</span>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 일반 모드
  return (
    <div className="flex flex-col h-full flex-1 bg-[oklch(23.93%_0_0)] border-2 border-black rounded-base overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}>
      {/* 채팅방 정보 */}
      {renderChatRoomInfo()}
      
      {/* 채팅 메시지 */}
      {renderChatMessages()}
      
      {/* 채팅 입력 */}
      {renderChatInput()}
    </div>
  );
} 