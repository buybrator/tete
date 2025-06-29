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

  // 디버깅: tempAvatar 값 변경 추적
  useEffect(() => {
    console.log('📱 모바일 tempAvatar 상태 변경됨:', tempAvatar);
  }, [tempAvatar]);

  // 다이얼로그가 열릴 때마다 최신 프로필 정보로 업데이트
  useEffect(() => {
    if (isDialogOpen) {
      console.log('📱 모바일 다이얼로그 열림 - 최신 프로필 정보로 업데이트');
      console.log('📱 현재 nickname:', nickname, 'avatar:', avatar);
      setTempNickname(nickname || '');
      setTempAvatar(avatar || DEFAULT_AVATARS[0]);
    }
  }, [isDialogOpen, nickname, avatar]);

  // Dialog가 열릴 때 현재 값들로 초기화
  const handleDialogOpen = useCallback(() => {
    console.log('📱 모바일 프로필 편집 팝업 열기 - 현재 아바타:', avatar);
    console.log('📱 모바일 프로필 편집 팝업 열기 - 현재 닉네임:', nickname);
    setTempNickname(nickname || '');
    setTempAvatar(avatar || DEFAULT_AVATARS[0]);
    setIsDialogOpen(true);
  }, [avatar, nickname]);

  // 변경사항 저장
  const handleSave = useCallback(async () => {
    console.log('📱 모바일 프로필 저장 시작 - 닉네임:', tempNickname, '아바타:', tempAvatar?.substring(0, 50) + '...');
    
    try {
      await updateProfile({
        nickname: tempNickname,
        avatar: tempAvatar
      });
      console.log('✅ 모바일 프로필 저장 완료');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('❌ 모바일 프로필 저장 실패:', error);
      // 에러가 발생해도 일단 팝업은 닫기
      setIsDialogOpen(false);
    }
  }, [tempNickname, tempAvatar, updateProfile]);

  // 이미지 파일 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        console.log('📱 모바일 이미지 업로드 완료:', imageUrl.substring(0, 50) + '...');
        console.log('📱 모바일 setTempAvatar 호출 전 - 현재 tempAvatar:', tempAvatar);
        setTempAvatar(imageUrl);
        console.log('📱 모바일 setTempAvatar 호출 완료 - 새로운 값:', imageUrl.substring(0, 50) + '...');
        
        // 강제로 리렌더링 트리거 (개발 중 디버깅용)
        setTimeout(() => {
          console.log('📱 모바일 1초 후 tempAvatar 상태:', tempAvatar);
        }, 1000);
        
        // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.onerror = (error) => {
        console.error('📱 모바일 이미지 읽기 오류:', error);
        alert('이미지를 읽는 중 오류가 발생했습니다.');
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-blue-400 text-white hover:text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 text-white group-hover:text-black" />
          <span className="text-xs uppercase tracking-wide leading-none">
            {isConnecting ? 'connecting' : 'account'}
          </span>
        </button>
        {error && (
          <span className="text-xs text-red-300 mt-1 text-center px-2">{error}</span>
        )}
      </div>
    );
  }

  // 지갑이 연결된 경우
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-green-400 text-white hover:text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
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

      <DialogContent 
        className="max-w-[95vw] w-full mx-2 sm:max-w-md sm:mx-0 bg-[oklch(0.2393_0_0)] border-2 border-black text-white [&>button]:border-2 [&>button]:border-black [&>button]:bg-[oklch(0.75_0.183_55.934)] [&>button]:hover:bg-[oklch(0.65_0.183_55.934)] [&>button]:shadow-[4px_4px_0px_0px_black] [&>button]:hover:shadow-none [&>button]:hover:translate-x-1 [&>button]:hover:translate-y-1 [&>button]:transition-all [&>button]:rounded-none"
        style={{ borderRadius: '0px' }}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-white">프로필 편집</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-900 border-2 border-black rounded-none p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        
        <div className="space-y-3">
          {/* 아바타 선택 */}
          <div className="space-y-2">
            <Label className="text-sm text-white">아바타</Label>
            
            {/* 현재 아바타 미리보기 */}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="relative group cursor-pointer"
                onClick={triggerFileUpload}
              >
                <div 
                  className="w-12 h-12 border-2 border-black flex items-center justify-center overflow-hidden relative"
                  style={{ 
                    backgroundColor: 'oklch(0.2393 0 0)',
                    minWidth: '48px',
                    minHeight: '48px',
                    maxWidth: '48px',
                    maxHeight: '48px'
                  }}
                >
                  {tempAvatar && (tempAvatar.startsWith('data:') || tempAvatar.startsWith('http')) ? (
                    <img 
                      src={tempAvatar} 
                      alt="아바타 미리보기" 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '0px',
                        display: 'block'
                      }}
                      onLoad={(e) => {
                        console.log('✅ 모바일 미리보기 이미지 로드 성공');
                        console.log('✅ 모바일 이미지 크기:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                      }}
                      onError={(e) => {
                        console.error('❌ 모바일 미리보기 이미지 로드 실패:', e);
                        console.error('모바일 tempAvatar 값:', tempAvatar?.substring(0, 100));
                      }}
                    />
                  ) : (
                    <span className="text-lg text-white" style={{ display: 'block' }}>
                      {tempAvatar || '👤'}
                    </span>
                  )}
                </div>
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    zIndex: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                    const upload = e.currentTarget.querySelector('.upload-icon');
                    if (upload) (upload as HTMLElement).style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                    const upload = e.currentTarget.querySelector('.upload-icon');
                    if (upload) (upload as HTMLElement).style.opacity = '0';
                  }}
                >
                  <Upload 
                    className="upload-icon h-3 w-3 text-white transition-opacity" 
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-300 flex-1">
                클릭하여 이미지를 업로드하세요
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
          </div>

          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-sm text-white">닉네임</Label>
            <Input
              id="nickname"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              placeholder={address ? `기본값: ${address.slice(0, 4)}...${address.slice(-4)}` : '닉네임을 입력하세요'}
              className="border-2 border-black focus:border-black focus:ring-0 rounded-none bg-[oklch(0.2393_0_0)] text-white placeholder:text-gray-300 text-sm"
            />
          </div>

          {/* 지갑 주소 표시 - 모바일에서는 줄바꿈 허용 */}
          <div className="space-y-2">
            <Label className="text-sm text-white">지갑 주소</Label>
            <div className="p-2 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-xs font-mono text-gray-300 break-all">
              {address}
            </div>
          </div>

          {/* SOL 잔고 표시 */}
          <div className="space-y-2">
            <Label className="text-sm text-white">SOL 잔고</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-xs font-mono text-gray-300">
                {isLoadingBalance ? '로딩 중...' : formatBalance(balance)}
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isLoadingBalance}
                className="shrink-0 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-white hover:bg-[oklch(0.3_0_0)] p-2"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* 버튼들 - 모바일에서는 세로 배치 */}
          <div className="flex flex-col space-y-2 pt-2">
            <Button
              onClick={handleSave}
              className="bg-green-600 border-2 border-black rounded-none text-white hover:bg-green-700 w-full text-sm py-2"
              disabled={isConnecting}
            >
              저장
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="neutral"
                onClick={() => setIsDialogOpen(false)}
                className="bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-white hover:bg-[oklch(0.3_0_0)] flex-1 text-sm py-2"
              >
                취소
              </Button>
              <Button
                variant="reverse"
                onClick={handleDisconnectWallet}
                className="bg-red-600 border-2 border-black rounded-none text-white hover:bg-red-700 flex-1 text-sm py-2"
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
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-yellow-400 text-white hover:text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
        >
          <Compass className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200 text-white group-hover:text-black" />
          <span className="text-xs uppercase tracking-wide leading-none">explore</span>
        </button>

        {/* Search */}
        <button 
          className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-pink-400 text-white hover:text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
          style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
          onClick={openSearchSidebar}
        >
          <Search className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 text-white group-hover:text-black" />
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
          <div className="w-80 max-w-[85vw] bg-[oklch(0.2393_0_0)] border-l-2 border-black flex flex-col search-sidebar">
            {/* 사이드바 헤더 */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[oklch(0.2393_0_0)] text-white">
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
            <div className="p-4 border-b border-black">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input 
                  placeholder="채팅방 이름을 검색하세요..."
                  className="pl-10 border-2 border-black focus:border-black focus:ring-0 rounded-none bg-[oklch(0.2393_0_0)] text-white placeholder:text-gray-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* 검색 결과 목록 영역 (스크롤 가능) */}
            <div className="flex-1 p-4 search-sidebar-content">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-300">
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
                      className="w-full p-3 text-left bg-[oklch(0.2393_0_0)] hover:bg-[oklch(0.3_0_0)] transition-colors border-2 border-black rounded-none flex items-center gap-3"
                    >
                      <TokenAvatar 
                        tokenAddress={room.id}
                        tokenName={room.name}
                        size="md"
                        imageUrl={room.image}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-white">{room.name}</div>
                        <div className="text-sm text-gray-300">CA: {room.id.slice(0, 8)}...</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-300">
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
            <div className="p-4 border-t-2 border-black bg-[oklch(0.2393_0_0)]">
              <button
                onClick={handleCreateRoom}
                className="w-full p-3 text-left bg-[oklch(0.2393_0_0)] hover:bg-[oklch(0.3_0_0)] transition-colors border-2 border-black rounded-none flex items-center gap-3 text-white font-medium"
              >
                <span className="text-xl">➕</span>
                                  <div className="flex-1">
                    <div className="font-semibold">Create chat room</div>
                    <div className="text-xs text-gray-300">새로운 채팅방 만들기</div>
                  </div>
              </button>
              
              {/* 총 채팅방 개수 */}
              <p className="text-xs text-gray-300 text-center mt-2">
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