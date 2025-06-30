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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-300" />
        <Input 
          placeholder="채팅방 검색 및 선택..."
          className="pl-10 border-2 border-black focus:border-black focus:ring-0 rounded-none bg-[oklch(0.2393_0_0)] text-white placeholder:text-gray-300"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleFocus}
        />
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div 
            className="w-full text-white border-2 border-black rounded-none shadow-[var(--shadow)] flex flex-col"
            style={{ backgroundColor: 'oklch(0.2393 0 0)' }}
          >
            <div className="px-2 py-1.5 text-sm font-semibold">채팅방 목록</div>
            <div className="h-px bg-black mx-1"></div>
            
            <div className="max-h-[240px] overflow-y-auto">
              {isLoading ? (
                <div className="relative flex select-none items-center rounded-none px-2 py-1.5 text-sm outline-none">
                  <span className="text-sm text-gray-300">
                    채팅방 로딩 중...
                  </span>
                </div>
              ) : filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className="relative flex cursor-pointer select-none items-center rounded-none px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[oklch(0.3_0_0)] hover:text-white hover:border-2 hover:border-black data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-3 border-2 border-transparent"
                  >
                    <TokenAvatar 
                      tokenAddress={room.id}
                      tokenName={room.name}
                      size="sm"
                      imageUrl={room.image}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{room.name}</div>
                      <div className="text-sm text-gray-300">CA: {room.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative flex select-none items-center rounded-none px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <span className="text-sm text-gray-300">
                    &apos;{searchQuery}&apos;와 일치하는 채팅방이 없습니다.
                  </span>
                </div>
              )}
            </div>
            
            <div className="h-px bg-black mx-1"></div>
            
            <div
              onClick={handleCreateRoom}
              className="relative flex cursor-pointer select-none items-center rounded-none px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[oklch(0.3_0_0)] hover:text-white hover:border-2 hover:border-black data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-3 border-2 border-transparent text-white font-medium"
            >
              <span className="text-lg">➕</span>
              <div className="flex-1">
                <div className="font-semibold">Create chat room</div>
                <div className="text-xs text-gray-300">새로운 채팅방 만들기</div>
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
  const [isUploading, setIsUploading] = useState(false);

  // 디버깅: tempAvatar 값 변경 추적
  useEffect(() => {
    console.log('🔄 tempAvatar 상태 변경됨:', tempAvatar);
  }, [tempAvatar]);

  // 다이얼로그가 열릴 때마다 최신 프로필 정보로 업데이트
  useEffect(() => {
    if (isDialogOpen) {
      console.log('다이얼로그 열림 - 최신 프로필 정보로 업데이트');
      console.log('현재 nickname:', nickname, 'avatar:', avatar);
      setTempNickname(nickname || '');
      setTempAvatar(avatar || '👤');
    }
  }, [isDialogOpen, nickname, avatar]);



  const handleDialogOpen = useCallback(() => {
    console.log('프로필 편집 팝업 열기 - 현재 아바타:', avatar);
    console.log('프로필 편집 팝업 열기 - 현재 닉네임:', nickname);
    setTempNickname(nickname || '');
    setTempAvatar(avatar || '👤');
    setIsDialogOpen(true);
  }, [avatar, nickname]);

  const handleSave = useCallback(async () => {
    console.log('프로필 저장 시작 - 닉네임:', tempNickname, '아바타:', tempAvatar?.substring(0, 50) + '...');
    
    try {
      await updateProfile({
        nickname: tempNickname,
        avatar: tempAvatar
      });
      console.log('✅ 프로필 저장 완료');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('❌ 프로필 저장 실패:', error);
      // 에러가 발생해도 일단 팝업은 닫기
      setIsDialogOpen(false);
    }
  }, [tempNickname, tempAvatar, updateProfile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      
      // Supabase Storage에 업로드
      handleSupabaseUpload(file);
      
      // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSupabaseUpload = async (file: File) => {
    if (!address) return;
    
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
        console.log('✅ PC 이미지 업로드 완료:', result.avatar_url);
        
        // 업로드 후 즉시 프로필 업데이트
        await updateProfile({
          nickname: tempNickname,
          avatar: result.avatar_url
        });
        console.log('✅ PC 프로필 자동 업데이트 완료');
      } else {
        console.error('❌ PC 이미지 업로드 실패:', result.error);
        alert('이미지 업로드에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('❌ PC 이미지 업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
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

  // 안전한 아바타 fallback 함수
  const getDisplayAvatarFallback = () => {
    // 이모지인지 확인 (길이가 2 이하이고 유니코드 이모지 범위)
    if (avatar && avatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(avatar)) {
      return avatar;
    }
    
    // 닉네임이 있으면 첫 글자 사용
    if (nickname && nickname.trim()) {
      return nickname.charAt(0).toUpperCase();
    }
    
    // 지갑 주소 기반 fallback
    if (address) {
      return address.slice(2, 4).toUpperCase();
    }
    
    // 기본 아바타
    return '👤';
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
            {avatar?.startsWith('data:') || avatar?.startsWith('http') ? (
              <img 
                src={avatar} 
                alt="아바타" 
                className="w-full h-full object-cover"
                style={{ borderRadius: '0px' }}
              />
            ) : (
              <AvatarFallback className="text-sm">
                {getDisplayAvatarFallback()}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium flex-1 text-center">
            {nickname || `${address?.slice(0, 4)}...${address?.slice(-4)}`}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-md bg-[oklch(0.2393_0_0)] border-2 border-black text-white [&>button]:border-2 [&>button]:border-black [&>button]:bg-[oklch(0.75_0.183_55.934)] [&>button]:hover:bg-[oklch(0.65_0.183_55.934)] [&>button]:shadow-[4px_4px_0px_0px_black] [&>button]:hover:shadow-none [&>button]:hover:translate-x-1 [&>button]:hover:translate-y-1 [&>button]:transition-all [&>button]:rounded-none" 
        style={{ borderRadius: '0px' }}
      >
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-900 border-2 border-black rounded-none p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">아바타</Label>
            
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div 
                  className="w-16 h-16 border-2 border-black flex items-center justify-center overflow-hidden relative"
                  style={{ 
                    backgroundColor: 'oklch(0.2393 0 0)',
                    minWidth: '64px',
                    minHeight: '64px',
                    maxWidth: '64px',
                    maxHeight: '64px'
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
                        console.log('✅ 미리보기 이미지 로드 성공');
                        console.log('✅ 이미지 크기:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                      }}
                      onError={(e) => {
                        console.error('❌ 미리보기 이미지 로드 실패:', e);
                        console.error('tempAvatar 값:', tempAvatar?.substring(0, 100));
                      }}
                    />
                  ) : (
                    <span className="text-2xl text-white" style={{ display: 'block' }}>
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
                    className="upload-icon h-4 w-4 text-white transition-opacity" 
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-300">
                {isUploading ? (
                  <span className="text-blue-400">이미지 업로드 중...</span>
                ) : (
                  '클릭하여 이미지를 업로드하세요'
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            

          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-white">닉네임</Label>
            <Input
              id="nickname"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              placeholder={address ? `기본값: ${address.slice(0, 4)}...${address.slice(-4)}` : '닉네임을 입력하세요'}
              className="border-2 border-black focus:border-black focus:ring-0 rounded-none bg-[oklch(0.2393_0_0)] text-white placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">지갑 주소</Label>
            <div className="p-2 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-sm font-mono text-gray-300 break-all">
              {address}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">SOL 잔고</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-sm font-mono text-gray-300">
                {isLoadingBalance ? '로딩 중...' : formatBalance(balance)}
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isLoadingBalance}
                className="shrink-0 bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-white hover:bg-[oklch(0.3_0_0)]"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex justify-between space-x-2">
            <Button
              variant="reverse"
              onClick={handleDisconnectWallet}
              className="bg-red-600 border-2 border-black rounded-none text-white hover:bg-red-700"
              disabled={isConnecting}
            >
              {isConnecting ? '해제 중...' : '지갑 연결 해제'}
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="neutral"
                onClick={() => setIsDialogOpen(false)}
                className="bg-[oklch(0.2393_0_0)] border-2 border-black rounded-none text-white hover:bg-[oklch(0.3_0_0)]"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-600 border-2 border-black rounded-none text-white hover:bg-green-700"
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