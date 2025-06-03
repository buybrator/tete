'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWallet } from '@/hooks/useWallet';
import SolanaStatus from '@/components/SolanaStatus';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Mock 채팅방 데이터 (실제로는 API에서 가져옴)
const mockRooms = [
  { id: 'sol-usdc', name: 'SOL/USDC', image: '💰', description: 'Solana USDC 거래' },
  { id: 'bonk', name: 'BONK', image: '🐕', description: 'BONK 밈코인 거래' },
  { id: 'wif', name: 'WIF', image: '🧢', description: 'Dogwifhat 거래' },
  { id: 'jup', name: 'JUP', image: '🪐', description: 'Jupiter 거래' },
  { id: 'ray', name: 'RAY', image: '⚡', description: 'Raydium 거래' },
  { id: 'samo', name: 'SAMO', image: '🐕‍🦺', description: 'Samoyed 거래' },
];

interface ChatRoomSearchProps {
  onRoomSelect?: (roomId: string) => void;
}

function ChatRoomSearch({ onRoomSelect }: ChatRoomSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

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
    setSearchQuery(room.name); // 선택된 방 이름을 입력창에 표시
    setShowResults(false); // 결과 목록 숨기기
    onRoomSelect?.(room.id);
    
    console.log('선택된 채팅방:', room.id);
  }, [onRoomSelect]);

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
            className="w-full max-h-60 overflow-y-auto text-popover-foreground border rounded-md shadow-[var(--shadow)]"
            style={{ backgroundColor: 'oklch(72.27% 0.1894 50.19)' }}
          >
            <div className="px-2 py-1.5 text-sm font-semibold">채팅방 목록</div>
            <div className="h-px bg-border mx-1"></div>
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomSelect(room)}
                  className="relative flex cursor-pointer select-none items-center rounded-[5px] px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground hover:border-2 hover:border-black data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-3 border-2 border-transparent"
                >
                  <span className="text-lg">{room.image}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{room.name}</div>
                    <div className="text-sm text-muted-foreground">{room.description}</div>
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
        </div>
      )}
    </div>
  );
}

// 지갑 프로필 컴포넌트
function WalletProfile() {
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

  // 이미지 업로드 처리
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setTempAvatar(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // 지갑 연결 - useWalletModal 사용
  const handleConnectWallet = () => {
    setVisible(true);
  };

  // 지갑이 연결되지 않은 경우
  if (!walletState.isConnected) {
    return (
      <Button className="neobrutalism-button" onClick={handleConnectWallet}>
        지갑 연결
      </Button>
    );
  }

  // 지갑이 연결된 경우
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="neutral"
          className="neobrutalism-button flex items-center gap-2 px-3 py-2"
          onClick={handleDialogOpen}
        >
          <Avatar className="h-6 w-6">
            {walletState.avatar?.startsWith('data:') ? (
              <img 
                src={walletState.avatar} 
                alt="아바타" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <AvatarFallback className="text-sm">
                {walletState.avatar}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">
            {walletState.nickname}
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
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full border-2 border-border bg-gray-100 flex items-center justify-center overflow-hidden">
                  {tempAvatar.startsWith('data:') ? (
                    <img 
                      src={tempAvatar} 
                      alt="아바타" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{tempAvatar}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
                  <Upload className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                클릭하여 이미지를 업로드하거나<br />
                아래에서 기본 아바타를 선택하세요
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
              placeholder={walletState.address ? `기본값: ${walletState.address.slice(0, 4)}...${walletState.address.slice(-4)}` : '닉네임을 입력하세요'}
              className="neobrutalism-input"
            />
          </div>

          {/* 지갑 주소 표시 */}
          <div className="space-y-2">
            <Label>지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-sm font-mono text-gray-600">
              {walletState.address}
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-between space-x-2">
            <Button
              variant="reverse"
              onClick={disconnectWallet}
              className="neobrutalism-button"
            >
              지갑 연결 해제
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="neutral"
                onClick={() => setIsDialogOpen(false)}
                className="neobrutalism-button"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="neobrutalism-button"
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Navbar() {
  const handleRoomSelect = useCallback((roomId: string) => {
    // 채팅방 선택 시 처리 로직
    // 실제로는 전역 상태나 URL 변경을 통해 채팅 영역을 업데이트
    console.log('네비게이션에서 채팅방 선택:', roomId);
    
    // 예: 채팅 영역으로 메시지 전송하여 선택된 방으로 변경
    window.dispatchEvent(new CustomEvent('roomSelected', { 
      detail: { roomId } 
    }));
  }, []);

  const navContent = (
    <>
      {/* 로고 */}
      <div className="navbar-logo">
        🚀 TradeChat
      </div>

      {/* 채팅방 검색 (Desktop 중앙) */}
      <div className="navbar-center hidden lg:flex">
        <ChatRoomSearch onRoomSelect={handleRoomSelect} />
      </div>

      {/* 우측 컨트롤 영역 */}
      <div className="navbar-right hidden lg:flex items-center space-x-3">
        {/* Solana 연결 상태 */}
        <SolanaStatus />
        
        {/* 지갑 연결 */}
        <WalletProfile />
      </div>

      {/* 모바일용 UI 요소 (예: 햄버거 메뉴 트리거 등)는 여기에 추가할 수 있습니다. */}
      {/* 현재는 데스크톱의 navbar-center와 navbar-right가 모바일에서 hidden 처리되므로, */}
      {/* 모바일에서는 로고만 보이게 됩니다. 필요시 모바일 전용 UI 요소를 추가하세요. */}
    </>
  );

  return (
    <>
      <nav className="desktop-navbar hidden lg:flex">
        {navContent}
      </nav>
      <nav className="mobile-navbar flex lg:hidden">
        {navContent}
      </nav>
    </>
  );
} 