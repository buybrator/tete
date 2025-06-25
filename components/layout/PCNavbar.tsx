'use client';

import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Search, RefreshCw } from 'lucide-react';
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

  const handleDialogOpen = () => {
    setTempNickname(nickname || '');
    setTempAvatar(avatar || DEFAULT_AVATARS[0]);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    updateProfile({
      nickname: tempNickname,
      avatar: tempAvatar
    });
    setIsDialogOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button 
          className="border-2 border-black rounded-none h-[36px] px-6 font-semibold shadow-[4px_4px_0px_0px_black] hover:shadow-none focus:shadow-none active:shadow-none"
          style={{ 
            backgroundColor: 'oklch(23.93% 0 0)',
            color: 'oklch(0.9249 0 0)'
          }}
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? '연결 중...' : '지갑 연결'}
        </Button>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="neutral"
          className="border-2 border-black rounded-none h-[36px] pl-0 pr-6 flex items-center justify-start shadow-[4px_4px_0px_0px_black] hover:shadow-none active:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 transition-all"
          style={{ 
            backgroundColor: 'oklch(23.93% 0 0)',
            color: 'oklch(0.9249 0 0)'
          }}
          onClick={handleDialogOpen}
          disabled={isConnecting}
        >
          <Avatar className="w-8 h-8" style={{ minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', width: '32px', height: '32px', borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', marginLeft: '0px' }}>
            {avatar?.startsWith('data:') ? (
              <img 
                src={avatar} 
                alt="아바타" 
                className="w-full h-full object-cover"
                style={{ borderRadius: '0px' }}
              />
            ) : (
              <AvatarFallback className="text-sm">
                {avatar}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium flex-1 text-center">
            {nickname || `${address?.slice(0, 4)}...${address?.slice(-4)}`}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-base p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>아바타</Label>
            
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 border-2 border-border bg-gray-100 flex items-center justify-center overflow-hidden">
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
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
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
              {DEFAULT_AVATARS.map((avatarOption) => (
                <button
                  key={avatarOption}
                  onClick={() => setTempAvatar(avatarOption)}
                  className={`p-2 rounded-base border-2 text-lg hover:bg-gray-100 transition-colors ${
                    tempAvatar === avatarOption 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-border'
                  }`}
                >
                  {avatarOption}
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
              placeholder={address ? `기본값: ${address.slice(0, 4)}...${address.slice(-4)}` : '닉네임을 입력하세요'}
              className="neobrutalism-input"
            />
          </div>

          <div className="space-y-2">
            <Label>지갑 주소</Label>
            <div className="p-2 bg-gray-100 rounded-base text-sm font-mono text-gray-600 break-all">
              {address}
            </div>
          </div>

          <div className="space-y-2">
            <Label>SOL 잔고</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-100 rounded-base text-sm font-mono text-gray-700">
                {isLoadingBalance ? '로딩 중...' : formatBalance(balance)}
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isLoadingBalance}
                className="shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex justify-between space-x-2">
            <Button
              variant="reverse"
              onClick={handleDisconnectWallet}
              className="neobrutalism-button"
              disabled={isConnecting}
            >
              {isConnecting ? '해제 중...' : '지갑 연결 해제'}
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
                disabled={isConnecting}
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
      <nav className="hidden lg:flex h-[70px] w-full bg-[oklch(23.93%_0_0)] border-b-4 border-black items-center justify-between px-6">
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