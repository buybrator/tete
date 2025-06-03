'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Compass, Search, User, X, Upload } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Mock 채팅방 데이터 (Navbar와 동일)
const mockRooms = [
  { id: 'sol-usdc', name: 'SOL/USDC', image: '💰', description: 'Solana USDC 거래' },
  { id: 'bonk', name: 'BONK', image: '🐕', description: 'BONK 밈코인 거래' },
  { id: 'wif', name: 'WIF', image: '🧢', description: 'Dogwifhat 거래' },
  { id: 'jup', name: 'JUP', image: '🪐', description: 'Jupiter 거래' },
  { id: 'ray', name: 'RAY', image: '⚡', description: 'Raydium 거래' },
  { id: 'samo', name: 'SAMO', image: '🐕‍🦺', description: 'Samoyed 거래' },
];

// 모바일용 지갑 프로필 컴포넌트
function MobileWalletProfile() {
  const { walletState, disconnectWallet, updateNickname, updateAvatar, DEFAULT_AVATARS } = useWallet();
  const { setVisible } = useWalletModal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog가 열릴 때 현재 값들로 초기화
  const handleDialogOpen = () => {
    setTempNickname(walletState.nickname || '');
    setTempAvatar(walletState.avatar || DEFAULT_AVATARS[0]);
    setIsDialogOpen(true);
  };

  // 변경사항 저장
  const handleSave = () => {
    updateNickname(tempNickname);
    updateAvatar(tempAvatar);
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

  // 지갑이 연결되지 않은 경우
  if (!walletState.isConnected) {
    return (
      <button 
        className="group relative flex flex-col items-center justify-center gap-1 bg-transparent hover:bg-blue-400 text-black transition-colors duration-150 font-bold h-full px-3 py-2 border-none outline-none"
        style={{ boxShadow: 'none', border: 'none', background: 'transparent' }}
        onClick={() => setVisible(true)}
      >
        <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
        <span className="text-xs uppercase tracking-wide leading-none">account</span>
      </button>
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
        >
          <div className="relative group-hover:scale-110 transition-transform duration-200">
            <Avatar className="h-5 w-5">
              {walletState.avatar?.startsWith('data:') ? (
                <img 
                  src={walletState.avatar} 
                  alt="아바타" 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarFallback className="text-xs bg-white text-black">
                  {walletState.avatar}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          {walletState.nickname ? (
            <span className="text-xs uppercase tracking-wide leading-none">
              {walletState.nickname}
            </span>
          ) : (
            <span className="text-xs tracking-wide leading-none">
              {`${walletState.address?.slice(0, 4)}...${walletState.address?.slice(-4)}`}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] w-full mx-2 sm:max-w-md sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-center">프로필 편집</DialogTitle>
        </DialogHeader>
        
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
                <div className="w-12 h-12 rounded-full border-2 border-border bg-gray-100 flex items-center justify-center overflow-hidden">
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
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
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
              placeholder={walletState.address ? `기본값: ${walletState.address.slice(0, 4)}...${walletState.address.slice(-4)}` : '닉네임을 입력하세요'}
              className="neobrutalism-input text-sm"
            />
          </div>

          {/* 지갑 주소 표시 - 모바일에서는 줄바꿈 허용 */}
          <div className="space-y-2">
            <Label className="text-sm">지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-xs font-mono text-gray-600 break-all">
              {walletState.address}
            </div>
          </div>

          {/* 버튼들 - 모바일에서는 세로 배치 */}
          <div className="flex flex-col space-y-2 pt-2">
            <Button
              onClick={handleSave}
              className="neobrutalism-button w-full text-sm py-2"
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
                onClick={disconnectWallet}
                className="neobrutalism-button flex-1 text-sm py-2"
              >
                연결 해제
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

  // 검색된 채팅방 목록
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return mockRooms;
    
    const query = searchQuery.toLowerCase();
    return mockRooms.filter(room => 
      room.name.toLowerCase().includes(query) ||
      room.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 채팅방 선택 핸들러
  const handleRoomSelect = useCallback((room: typeof mockRooms[0]) => {
    // 채팅 영역으로 메시지 전송하여 선택된 방으로 변경
    window.dispatchEvent(new CustomEvent('roomSelected', { 
      detail: { roomId: room.id } 
    }));
    
    // 사이드바 닫기
    setShowSearchSidebar(false);
    setSearchQuery('');
    
    console.log('MobilePutter: 채팅방 선택 ->', room.id);
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

            {/* 검색 결과 목록 */}
            <div className="flex-1 overflow-y-auto p-4 search-sidebar-content">
              {filteredRooms.length > 0 ? (
                <div className="space-y-2">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room)}
                      className="w-full p-3 text-left bg-secondary-background hover:bg-main/10 transition-colors border-2 border-border rounded-base flex items-center gap-3"
                    >
                      <span className="text-xl">{room.image}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{room.name}</div>
                        <div className="text-sm text-muted-foreground">{room.description}</div>
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

            {/* 사이드바 푸터 */}
            <div className="p-4 border-t border-border bg-secondary-background/50">
              <p className="text-xs text-muted-foreground text-center">
                총 {filteredRooms.length}개의 채팅방
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
} 