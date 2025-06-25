'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Compass, Search, User, X, Upload, RefreshCw } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import TokenAvatar from '@/components/ui/TokenAvatar';
import CreateChatRoomDialog from './CreateChatRoomDialog';

// Mock 채팅방 데이터 (fallback용)
const mockRooms = [
  { id: 'sol-usdc', name: 'SOL/USDC', image: '💰', description: 'Solana USDC 거래' },
  { id: 'bonk', name: 'BONK', image: '🐕', description: 'BONK 밈코인 거래' },
  { id: 'wif', name: 'WIF', image: '🧢', description: 'Dogwifhat 거래' },
  { id: 'jup', name: 'JUP', image: '🪐', description: 'Jupiter 거래' },
  { id: 'ray', name: 'RAY', image: '⚡', description: 'Raydium 거래' },
  { id: 'samo', name: 'SAMO', image: '🐕‍🦺', description: 'Samoyed 거래' },
];

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

// UI용 채팅방 타입
interface ChatRoom {
  id: string;
  name: string;
  image: string;
  description: string;
}

// 모바일용 지갑 프로필 컴포넌트
function MobileWalletProfile() {
  const { 
    isConnected,
    isConnecting,
    address,
    nickname,
    avatar,
    balance,
    isLoadingBalance,
    error,
    connectWallet, 
    disconnectWallet, 
    updateProfile,
    fetchBalance,
    clearError
  } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기본 아바타 배열
  const DEFAULT_AVATARS = ['👤', '🧑', '👩', '🤵', '👩‍💼', '🧑‍💼', '👨‍💼', '🧙‍♂️', '🧙‍♀️', '🥷'];

  // Dialog가 열릴 때 현재 값들로 초기화
  const handleDialogOpen = () => {
    setTempNickname(nickname || '');
    setTempAvatar(avatar || DEFAULT_AVATARS[0]);
    setIsDialogOpen(true);
  };

  // 변경사항 저장
  const handleSave = () => {
    updateProfile({
      nickname: tempNickname,
      avatar: tempAvatar
    });
    setIsDialogOpen(false);
  };

  // 이미지 파일 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setTempAvatar(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // 파일 선택 트리거
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleConnectWallet = async () => {
    clearError();
    await connectWallet();
  };

  const handleDisconnectWallet = async () => {
    clearError();
    await disconnectWallet();
    setIsDialogOpen(false);
  };

  const handleRefreshBalance = async () => {
    await fetchBalance();
  };

  const formatBalance = (balance: number | null) => {
    if (balance === null) return 'N/A';
    return `${balance.toFixed(4)} SOL`;
  };

  // 지갑이 연결되지 않은 경우
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center">
        <button 
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-blue-400 text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-xs uppercase tracking-wide leading-none">
            {isConnecting ? 'connecting' : 'account'}
          </span>
        </button>
        {error && (
          <span className="text-xs text-red-500 mt-1 text-center px-2">{error}</span>
        )}
      </div>
    );
  }

  // 지갑이 연결된 경우
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-green-400 text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
          onClick={handleDialogOpen}
          disabled={isConnecting}
        >
          <div className="relative group-hover:scale-110 transition-transform duration-200">
            <Avatar className="w-8 h-8" style={{ minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', width: '32px', height: '32px', borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', marginLeft: '0px' }}>
              {avatar?.startsWith('data:') ? (
                <img 
                  src={avatar} 
                  alt="아바타" 
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '0px' }}
                />
              ) : (
                <AvatarFallback className="text-xs bg-white text-black">
                  {avatar}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          {nickname ? (
            <span className="text-xs uppercase tracking-wide leading-none">
              {nickname}
            </span>
          ) : (
            <span className="text-xs tracking-wide leading-none">
              {`${address?.slice(0, 4)}...${address?.slice(-4)}`}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] w-full mx-2 sm:max-w-md sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-center">프로필 편집</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-base p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div className="space-y-3">
          {/* 아바타 선택 */}
          <div className="space-y-2">
            <Label className="text-sm">아바타</Label>
            
            {/* 현재 아바타 미리보기 */}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="relative group cursor-pointer"
                onClick={triggerFileUpload}
              >
                <div className="w-12 h-12 border-2 border-border bg-gray-100 flex items-center justify-center overflow-hidden">
                  {tempAvatar.startsWith('data:') ? (
                    <img 
                      src={tempAvatar} 
                      alt="아바타" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">{tempAvatar}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <Upload className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div className="text-xs text-gray-600 flex-1">
                클릭하여 이미지 업로드 또는 아래에서 선택
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
            
            {/* 기본 아바타 선택 - 모바일에서는 4열 */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setTempAvatar(avatar)}
                  className={`p-2 rounded-base border-2 text-sm hover:bg-gray-100 transition-colors ${
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
            <Label htmlFor="nickname" className="text-sm">닉네임</Label>
            <Input
              id="nickname"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              placeholder={address ? `기본값: ${address.slice(0, 4)}...${address.slice(-4)}` : '닉네임을 입력하세요'}
              className="neobrutalism-input text-sm"
            />
          </div>

          {/* 지갑 주소 표시 - 모바일에서는 줄바꿈 허용 */}
          <div className="space-y-2">
            <Label className="text-sm">지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-xs font-mono text-gray-600 break-all">
              {address}
            </div>
          </div>

          {/* SOL 잔고 표시 */}
          <div className="space-y-2">
            <Label className="text-sm">SOL 잔고</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-100 rounded-base text-xs font-mono text-gray-700">
                {isLoadingBalance ? '로딩 중...' : formatBalance(balance)}
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isLoadingBalance}
                className="shrink-0 p-2"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* 버튼들 - 모바일에서는 세로 배치 */}
          <div className="flex flex-col space-y-2 pt-2">
            <Button
              onClick={handleSave}
              className="neobrutalism-button w-full text-sm py-2"
              disabled={isConnecting}
            >
              저장
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="neutral"
                onClick={() => setIsDialogOpen(false)}
                className="neobrutalism-button flex-1 text-sm py-2"
              >
                취소
              </Button>
              <Button
                variant="reverse"
                onClick={handleDisconnectWallet}
                className="neobrutalism-button flex-1 text-sm py-2"
                disabled={isConnecting}
              >
                {isConnecting ? '해제 중...' : '연결 해제'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MobilePutter() {
  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [apiRooms, setApiRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 사이드바 열림/닫힘 시 스크롤 위치 고정
  useEffect(() => {
    if (showSearchSidebar) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // HTML과 body 모두 고정
      const html = document.documentElement;
      const body = document.body;
      
      // 기존 스타일 저장
      const originalHtmlStyle = html.style.cssText;
      const originalBodyStyle = body.style.cssText;
      
      // HTML 고정
      html.style.position = 'fixed';
      html.style.top = `-${scrollY}px`;
      html.style.left = `-${scrollX}px`;
      html.style.width = '100%';
      html.style.height = '100%';
      html.style.overflow = 'hidden';
      
      // body 고정
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = `-${scrollX}px`;
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.overflow = 'hidden';
      
      return () => {
        // 원래 스타일로 복원
        html.style.cssText = originalHtmlStyle;
        body.style.cssText = originalBodyStyle;
        
        // 스크롤 위치 복원
        window.scrollTo(scrollX, scrollY);
      };
    }
  }, [showSearchSidebar]);

  // 실제 채팅방 데이터 로드
  const loadChatrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chatrooms');
      const data = await response.json();
      
      if (data.success) {
        // API 데이터를 UI 형식으로 변환
        const formattedRooms = data.chatrooms.map((room: ApiChatRoom) => ({
          id: room.contractAddress,
          name: room.name,
          image: room.image || '🪙', // 토큰 이미지 URL 또는 기본 이모지
          description: `CA: ${room.contractAddress.slice(0, 8)}...`
        }));
        setApiRooms(formattedRooms);
      }
    } catch (error) {
      console.error('채팅방 로드 오류:', error);
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
    if (!searchQuery.trim()) return allRooms;
    
    const query = searchQuery.toLowerCase();
    return allRooms.filter(room => 
      room.name.toLowerCase().includes(query) ||
      room.description.toLowerCase().includes(query)
    );
  }, [searchQuery, allRooms]);

  // 채팅방 선택 핸들러
  const handleRoomSelect = useCallback((room: ChatRoom) => {
    // 채팅 영역으로 메시지 전송하여 선택된 방으로 변경
    window.dispatchEvent(new CustomEvent('roomSelected', { 
      detail: { roomId: room.id } 
    }));
    
    // 사이드바 닫기
    setShowSearchSidebar(false);
    setSearchQuery('');
    
    console.log('MobilePutter: 채팅방 선택 ->', room.id);
  }, []);

  // Create room 핸들러
  const handleCreateRoom = useCallback(() => {
    // 채팅방 생성 dialog 열기
    console.log('모바일: 새 채팅방 생성 요청');
    
    // 사이드바 닫기
    setShowSearchSidebar(false);
    setSearchQuery('');
    
    // dialog 열기
    setIsCreateDialogOpen(true);
  }, []);

  // 검색 사이드바 열기
  const openSearchSidebar = useCallback(() => {
    setShowSearchSidebar(true);
  }, []);

  // 검색 사이드바 닫기
  const closeSearchSidebar = useCallback(() => {
    setShowSearchSidebar(false);
    setSearchQuery('');
  }, []);

  return (
    <>
      <footer className="mobile-putter">
        {/* Explore */}
        <button 
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-yellow-400 text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
        >
          <Compass className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
          <span className="text-xs uppercase tracking-wide leading-none">explore</span>
        </button>

        {/* Search */}
        <button 
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-pink-400 text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
          onClick={openSearchSidebar}
        >
          <Search className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-xs uppercase tracking-wide leading-none">search</span>
        </button>

        {/* Account - 지갑 연결 기능 */}
        <div className="relative">
          <MobileWalletProfile />
        </div>
      </footer>

      {/* 검색 사이드바 */}
      {showSearchSidebar && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="search-sidebar-overlay"
            onClick={closeSearchSidebar}
          />
          
          {/* 사이드바 */}
          <div className="w-80 max-w-[85vw] bg-background border-l-2 border-border flex flex-col search-sidebar">
            {/* 사이드바 헤더 */}
            <div className="flex items-center justify-between p-4 border-b-2 border-border bg-main text-main-foreground">
              <h2 className="text-lg font-bold">채팅방 검색</h2>
              <Button 
                onClick={closeSearchSidebar}
                size="sm"
                className="neobrutalism-button p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 검색 입력창 */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="채팅방 이름을 검색하세요..."
                  className="neobrutalism-input pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* 검색 결과 목록 영역 (스크롤 가능) */}
            <div className="flex-1 p-4 search-sidebar-content">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                    <p className="text-sm">채팅방 로딩 중...</p>
                  </div>
                </div>
              ) : filteredRooms.length > 0 ? (
                <div className="space-y-2">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room)}
                      className="w-full p-3 text-left bg-secondary-background hover:bg-main/10 transition-colors border-2 border-border rounded-base flex items-center gap-3"
                    >
                      <TokenAvatar 
                        tokenAddress={room.id}
                        tokenName={room.name}
                        size="md"
                        imageUrl={room.image}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{room.name}</div>
                        <div className="text-sm text-muted-foreground">CA: {room.id.slice(0, 8)}...</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery.trim() 
                        ? `'${searchQuery}'와 일치하는 채팅방이 없습니다.`
                        : '검색어를 입력해보세요.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Create chat room 고정 영역 */}
            <div className="p-4 border-t-2 border-border bg-secondary-background/50">
              <button
                onClick={handleCreateRoom}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 transition-colors border-2 border-blue-200 rounded-base flex items-center gap-3 text-blue-600 font-medium"
              >
                <span className="text-xl">➕</span>
                <div className="flex-1">
                  <div className="font-semibold">Create chat room</div>
                  <div className="text-xs text-blue-500">새로운 채팅방 만들기</div>
                </div>
              </button>
              
              {/* 총 채팅방 개수 */}
              <p className="text-xs text-muted-foreground text-center mt-2">
                총 {filteredRooms.length}개의 채팅방
              </p>
            </div>
          </div>
        </>
      )}

      {/* 채팅방 생성 Dialog */}
      <CreateChatRoomDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
} 