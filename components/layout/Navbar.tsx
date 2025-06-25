'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet'; // 원래대로 복구
// useWalletModal 제거 - 직접 연결 구현
import ClientOnly from '@/components/ClientOnly'; // Hydration 에러 방지용
import TokenAvatar from '@/components/ui/TokenAvatar';
import CreateChatRoomDialog from './CreateChatRoomDialog';

// Mock 채팅방 데이터 (실제로는 API에서 가져옴)
const mockRooms = [
  { id: 'sol-usdc', name: 'SOL/USDC', image: '💰', description: 'Solana USDC 거래' },
  { id: 'bonk', name: 'BONK', image: '🐕', description: 'BONK 밈코인 거래' },
  { id: 'wif', name: 'WIF', image: '🧢', description: 'Dogwifhat 거래' },
  { id: 'jup', name: 'JUP', image: '🪐', description: 'Jupiter 거래' },
  { id: 'ray', name: 'RAY', image: '⚡', description: 'Raydium 거래' },
  { id: 'samo', name: 'SAMO', image: '🐕‍🦺', description: 'Samoyed 거래' },
];

interface ChatRoom {
  id: string;
  name: string;
  image: string;
  description: string;
}

// API에서 받아오는 채팅방 타입
interface ApiChatRoom {
  id: string;
  contractAddress: string;
  name: string;
  creatorAddress: string;
  transactionSignature: string;
  createdAt: string;
  isActive: boolean;
  image?: string; // 토큰 메타데이터에서 가져온 이미지 URL
}

interface ChatRoomSearchProps {
  onRoomSelect?: (roomId: string) => void;
  onCreateRoom?: () => void;
}

function ChatRoomSearch({ onRoomSelect, onCreateRoom }: ChatRoomSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [apiRooms, setApiRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 실제 채팅방 데이터 로드
  const loadChatrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 채팅방 목록 로딩 시작...');
      const response = await fetch('/api/chatrooms');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 채팅방 목록 로딩 성공:', data.chatrooms);
        // API 데이터를 UI 형식으로 변환
        const formattedRooms = data.chatrooms.map((room: ApiChatRoom) => ({
          id: room.contractAddress,
          name: room.name,
          image: room.image || '🪙', // 토큰 이미지 URL 또는 기본 이모지
          description: `CA: ${room.contractAddress.slice(0, 8)}...`
        }));
        setApiRooms(formattedRooms);
        console.log('🎯 포맷된 채팅방 목록:', formattedRooms);
      }
    } catch (error) {
      console.error('❌ 채팅방 로드 오류:', error);
      // 오류 시 목 데이터 유지
      setApiRooms(mockRooms);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadChatrooms();
  }, [loadChatrooms]);

  // 채팅방 생성 이벤트 리스너
  useEffect(() => {
    const handleChatroomCreated = () => {
      loadChatrooms(); // 새 채팅방 생성 시 목록 새로고침
    };

    window.addEventListener('chatroomCreated', handleChatroomCreated);
    return () => window.removeEventListener('chatroomCreated', handleChatroomCreated);
  }, [loadChatrooms]);

  // 검색된 채팅방 목록 (API 데이터 우선, 없으면 목 데이터)
  const allRooms = apiRooms.length > 0 ? apiRooms : mockRooms;
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return allRooms.slice(0, 5);
    
    const query = searchQuery.toLowerCase();
    return allRooms
      .filter(room => 
        room.name.toLowerCase().includes(query) ||
        room.description.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [searchQuery, allRooms]);

  // 채팅방 선택 핸들러
  const handleRoomSelect = useCallback((room: typeof mockRooms[0]) => {
    setShowResults(false); // 결과 목록 숨기기
    onRoomSelect?.(room.id);
    console.log('선택된 채팅방:', room.id);
  }, [onRoomSelect]);

  // Create room 핸들러
  const handleCreateRoom = useCallback(() => {
    setShowResults(false); // 결과 목록 숨기기
    onCreateRoom?.();
  }, [onCreateRoom]);

  // 검색 입력 핸들러
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(true);
  }, []);

  // 입력창 포커스 핸들러
  const handleFocus = useCallback(() => {
    setShowResults(true);
  }, []);

  // 결과 목록 외부 클릭 시 숨기기
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* 통합 검색 입력창 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="채팅방 검색 및 선택..."
          className="neobrutalism-input pl-10"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleFocus}
        />
      </div>

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div 
            className="w-full text-popover-foreground border rounded-md shadow-[var(--shadow)] flex flex-col"
            style={{ backgroundColor: 'oklch(72.27% 0.1894 50.19)' }}
          >
            {/* 헤더 */}
            <div className="px-2 py-1.5 text-sm font-semibold">채팅방 목록</div>
            <div className="h-px bg-border mx-1"></div>
            
            {/* 채팅방 목록 영역 (5개까지, 스크롤 가능) */}
            <div className="max-h-[240px] overflow-y-auto">
              {isLoading ? (
                <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none">
                  <span className="text-sm text-muted-foreground">
                    채팅방 로딩 중...
                  </span>
                </div>
              ) : filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className="relative flex cursor-pointer select-none items-center rounded-[5px] px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground hover:border-2 hover:border-black data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-3 border-2 border-transparent"
                  >
                    <TokenAvatar 
                      tokenAddress={room.id}
                      tokenName={room.name}
                      size="sm"
                      imageUrl={room.image}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{room.name}</div>
                      <div className="text-sm text-muted-foreground">CA: {room.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <span className="text-sm text-muted-foreground">
                    &apos;{searchQuery}&apos;와 일치하는 채팅방이 없습니다.
                  </span>
                </div>
              )}
            </div>
            
            {/* 구분선 */}
            <div className="h-px bg-border mx-1"></div>
            
            {/* Create chat room 옵션 (항상 고정) */}
            <div
              onClick={handleCreateRoom}
              className="relative flex cursor-pointer select-none items-center rounded-[5px] px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground hover:border-2 hover:border-black data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-3 border-2 border-transparent text-blue-600 font-medium"
            >
              <span className="text-lg">➕</span>
              <div className="flex-1">
                <div className="font-semibold">Create chat room</div>
                <div className="text-xs text-muted-foreground">새로운 채팅방 만들기</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 지갑 프로필 컴포넌트
function WalletProfile() {
  const { 
    isConnected, 
    address, 
    nickname, 
    avatar, 
    profile,
    disconnectWallet, 
    updateProfile,
    connectWallet
  } = useWallet();
  
  const DEFAULT_AVATARS = ['👤', '🧑', '👩', '🤵', '👩‍💼', '🧑‍💼', '👨‍💼', '🧙‍♂️', '🧙‍♀️', '🥷'];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog가 열릴 때 현재 값들로 초기화
  useEffect(() => {
    if (isDialogOpen && isConnected) {
      setTempNickname(nickname || '');
      // 아바타 설정 (useWallet에서 이미 처리됨)
      setTempAvatar(avatar || DEFAULT_AVATARS[0]);
    }
  }, [isDialogOpen, nickname, avatar, isConnected]);

  // 변경사항 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        nickname: tempNickname,
        avatar: tempAvatar
      });
      setIsDialogOpen(false);
      console.log('✅ 프로필 저장 완료');
    } catch (error) {
      console.error('❌ 프로필 저장 오류:', error);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 이미지 업로드 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet_address', address);

      const response = await fetch('/api/profiles/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setTempAvatar(result.avatar_url);
        console.log('✅ 이미지 업로드 완료:', result.avatar_url);
      } else {
        console.error('❌ 이미지 업로드 실패:', result.error);
        alert('이미지 업로드에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('❌ 이미지 업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 현재 표시할 아바타 결정
  const displayAvatar = () => {
    if (!avatar) return DEFAULT_AVATARS[0];
    return avatar; // useWallet에서 이미 emoji: 접두사를 제거했으므로 그대로 사용
  };

  // 지갑이 연결되지 않은 경우
  if (!isConnected) {
    return (
      <ClientOnly fallback={
        <Button className="neobrutalism-button" disabled>
          지갑 연결
        </Button>
      }>
        <Button 
          className="neobrutalism-button border-2 border-black rounded-none px-6 font-semibold shadow-[4px_4px_0px_0px_black] hover:shadow-none focus:shadow-none active:shadow-none"
          style={{ 
            backgroundColor: 'oklch(23.93% 0 0)',
            color: 'oklch(0.9249 0 0)'
          }}
          onClick={connectWallet}
        >
          지갑 연결
        </Button>
      </ClientOnly>
    );
  }

  // 지갑이 연결된 경우
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="neutral"
          className="neobrutalism-button border-2 border-black rounded-none shadow-[4px_4px_0px_0px_black] hover:shadow-none focus:shadow-none active:shadow-none flex items-center px-3 py-2"
          style={{ 
            backgroundColor: 'oklch(23.93% 0 0)',
            color: 'oklch(0.9249 0 0)'
          }}
          onClick={() => {
            setIsDialogOpen(true);
          }}
        >
          <div 
            className="relative flex shrink-0 overflow-hidden"
            style={{ 
              minWidth: '32px',
              minHeight: '32px',
              maxWidth: '32px',
              maxHeight: '32px',
              width: '32px',
              height: '32px',
              borderTopWidth: '0px',
              borderRightWidth: '0px',
              borderBottomWidth: '0px',
              borderLeftWidth: '0px',
              marginLeft: '0px',
              borderRadius: '0px',
              boxShadow: 'none'
            }}
          >
            {avatar?.startsWith('data:') || avatar?.startsWith('http') ? (
              <img 
                src={avatar} 
                alt="아바타" 
                className="w-full h-full object-cover"
                style={{ borderRadius: '0px' }}
                onError={(e) => {
                  console.error('❌ 아바타 이미지 로드 실패:', avatar);
                  // 이미지 로드 실패 시 기본 아바타로 대체
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="flex items-center justify-center bg-white text-black font-bold text-sm w-full h-full"
                style={{ borderRadius: '0px' }}
              >
                {displayAvatar()}
              </div>
            )}
          </div>
          <span className="text-sm font-medium flex-1 text-center">
            {(nickname && nickname.trim()) 
              ? nickname 
              : address 
                ? `${address.slice(0, 4)}...${address.slice(-4)}` 
                : '지갑 연결됨'
            }
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 아바타 선택 */}
          <div className="space-y-2">
            <Label>아바타</Label>
            
            {/* 현재 아바타 미리보기 */}
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 border-2 border-border bg-gray-100 flex items-center justify-center overflow-hidden">
                  {tempAvatar.startsWith('data:') || tempAvatar.startsWith('http') ? (
                    <img 
                      src={tempAvatar} 
                      alt="아바타" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{tempAvatar}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {isUploading ? (
                  <span className="text-blue-600">이미지 업로드 중...</span>
                ) : (
                  <>
                    클릭하여 이미지를 업로드하거나<br />
                    아래에서 기본 아바타를 선택하세요
                  </>
                )}
              </div>
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {/* 기본 아바타 선택 */}
            <div className="grid grid-cols-5 gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setTempAvatar(avatar)}
                  className={`p-2 rounded-base border-2 text-lg hover:bg-gray-100 transition-colors ${
                    tempAvatar === avatar 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-border'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              placeholder={address ? `기본값: ${address.slice(0, 4)}...${address.slice(-4)}` : '닉네임을 입력하세요'}
              className="neobrutalism-input"
            />
          </div>

          {/* 지갑 주소 표시 */}
          <div className="space-y-2">
            <Label>지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-sm font-mono text-gray-600">
              {address}
            </div>
          </div>

          {/* 저장된 프로필 상태 */}
          {profile && profile.updated_at && (
            <div className="text-xs text-gray-500 border-l-2 border-blue-200 pl-2">
              💾 마지막 저장: {new Date(profile.updated_at).toLocaleString('ko-KR')}
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex justify-between space-x-2">
            <Button
              variant="reverse"
              onClick={disconnectWallet}
              className="neobrutalism-button"
              disabled={isSaving}
            >
              지갑 연결 해제
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="neutral"
                onClick={() => setIsDialogOpen(false)}
                className="neobrutalism-button"
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="neobrutalism-button"
                disabled={isSaving || isUploading}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    저장 중...
                  </div>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Navbar() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleRoomSelect = useCallback((roomId: string) => {
    // 채팅방 선택 시 처리 로직
    console.log('네비게이션에서 채팅방 선택:', roomId);
    
    // ChatArea로 메시지 전송하여 선택된 방으로 변경
    window.dispatchEvent(new CustomEvent('roomSelected', { 
      detail: { roomId } 
    }));
  }, []);

  const handleCreateRoom = useCallback(() => {
    // 채팅방 생성 dialog 열기
    setIsCreateDialogOpen(true);
  }, []);

  const navContent = (
    <>
      {/* 로고 */}
      <div className="navbar-logo">
        🚀 TradeChat
      </div>

      {/* 채팅방 검색 (Desktop 중앙) */}
      <div className="navbar-center hidden lg:flex">
        <ChatRoomSearch 
          onRoomSelect={handleRoomSelect} 
          onCreateRoom={handleCreateRoom}
        />
      </div>

      {/* 우측 컨트롤 영역 */}
      <div className="navbar-right hidden lg:flex items-center space-x-3">
        {/* 지갑 연결 */}
        <WalletProfile />
      </div>

      {/* 채팅방 생성 Dialog */}
      <CreateChatRoomDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );

  return (
    <>
      <nav className="mobile-navbar flex lg:hidden">
        {navContent}
      </nav>
    </>
  );
} 