'use client';

import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Search } from 'lucide-react';
import { useRef, useEffect, useMemo } from 'react';
import CreateChatRoomDialog from './CreateChatRoomDialog';
import TokenAvatar from '@/components/ui/TokenAvatar';

// Mock 채팅방 데이터
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

interface ApiChatRoom {
  id: string;
  contractAddress: string;
  name: string;
  creatorAddress: string;
  transactionSignature: string;
  createdAt: string;
  isActive: boolean;
  image?: string;
}

interface ChatRoomSearchProps {
  onRoomSelect?: (roomId: string) => void;
  onCreateRoom?: () => void;
}

function PCChatRoomSearch({ onRoomSelect, onCreateRoom }: ChatRoomSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [apiRooms, setApiRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChatrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chatrooms');
      const data = await response.json();
      
      if (data.success) {
        const formattedRooms = data.chatrooms.map((room: ApiChatRoom) => ({
          id: room.contractAddress,
          name: room.name,
          image: room.image || '🪙',
          description: `CA: ${room.contractAddress.slice(0, 8)}...`
        }));
        setApiRooms(formattedRooms);
      }
    } catch (error) {
      console.error('❌ 채팅방 로드 오류:', error);
      setApiRooms(mockRooms);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChatrooms();
  }, [loadChatrooms]);

  useEffect(() => {
    const handleChatroomCreated = () => {
      loadChatrooms();
    };

    window.addEventListener('chatroomCreated', handleChatroomCreated);
    return () => window.removeEventListener('chatroomCreated', handleChatroomCreated);
  }, [loadChatrooms]);

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

  const handleRoomSelect = useCallback((room: typeof mockRooms[0]) => {
    setShowResults(false);
    onRoomSelect?.(room.id);
  }, [onRoomSelect]);

  const handleCreateRoom = useCallback(() => {
    setShowResults(false);
    onCreateRoom?.();
  }, [onCreateRoom]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(true);
  }, []);

  const handleFocus = useCallback(() => {
    setShowResults(true);
  }, []);

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

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div 
            className="w-full text-popover-foreground border rounded-md shadow-[var(--shadow)] flex flex-col"
            style={{ backgroundColor: 'oklch(72.27% 0.1894 50.19)' }}
          >
            <div className="px-2 py-1.5 text-sm font-semibold">채팅방 목록</div>
            <div className="h-px bg-border mx-1"></div>
            
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
            
            <div className="h-px bg-border mx-1"></div>
            
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

function PCWalletProfile() {
  const { walletState, disconnectWallet, updateNickname, updateAvatar, DEFAULT_AVATARS } = useWallet();
  const { setVisible } = useWalletModal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDialogOpen = () => {
    setTempNickname(walletState.nickname || '');
    setTempAvatar(walletState.avatar || DEFAULT_AVATARS[0]);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    updateNickname(tempNickname);
    updateAvatar(tempAvatar);
    setIsDialogOpen(false);
  };

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

  const handleConnectWallet = () => {
    setVisible(true);
  };

  if (!walletState.isConnected) {
    return (
      <Button className="neobrutalism-button" onClick={handleConnectWallet}>
        지갑 연결
      </Button>
    );
  }

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
          <div className="space-y-2">
            <Label>아바타</Label>
            
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

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
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

          <div className="space-y-2">
            <Label>지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-sm font-mono text-gray-600">
              {walletState.address}
            </div>
          </div>

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

export default function PCNavbar() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleRoomSelect = useCallback((roomId: string) => {
    console.log('PC 네비게이션에서 채팅방 선택:', roomId);
    
    window.dispatchEvent(new CustomEvent('roomSelected', { 
      detail: { roomId } 
    }));
  }, []);

  const handleCreateRoom = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  return (
    <>
      {/* PC 전용 Navbar - 70px 높이, padding 없음 */}
      <nav className="hidden lg:flex h-[70px] w-full bg-background border-b border-border items-center justify-between px-6">
        {/* 로고 */}
        <div className="flex items-center gap-3">
          {/* 정사각형들이 둘러싸는 로고 영역 */}
          <div className="relative">
            {/* 상단 정사각형들 */}
            <div className="absolute -top-[17.5px] left-0 flex">
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
            </div>
            
            {/* 좌우 정사각형들 */}
            <div className="flex items-center">
              <div className="flex flex-col">
                <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
                <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              </div>
              <div className="w-[35px] h-[35px] border-2 border-primary bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <div className="flex flex-col">
                <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
                <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              </div>
            </div>
            
            {/* 하단 정사각형들 */}
            <div className="absolute -bottom-[17.5px] left-0 flex">
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
              <div className="w-[17.5px] h-[17.5px] border border-gray-400"></div>
            </div>
          </div>
          
          <span className="text-xl font-bold text-primary">
            TradeChat
          </span>
        </div>

        {/* 중앙 채팅방 검색 */}
        <div className="flex-1 max-w-md mx-8">
          <PCChatRoomSearch 
            onRoomSelect={handleRoomSelect} 
            onCreateRoom={handleCreateRoom}
          />
        </div>

        {/* 우측 지갑 연결 */}
        <div className="flex items-center">
          <PCWalletProfile />
        </div>
      </nav>

      {/* 채팅방 생성 Dialog */}
      <CreateChatRoomDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
} 