import { OptimizedAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChatMessage } from '@/types';
import { useState, useEffect } from 'react';

type Props = {
  message: ChatMessage;
};

interface UserProfile {
  nickname?: string;
  avatar_url?: string;
}

export default function ChatBubble({ message }: Props) {
  const { avatar, tradeAmount, content, userAddress, nickname, tradeType } = message;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileFetchTime, setProfileFetchTime] = useState<number>(Date.now());

  // 프로필 정보 조회
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userAddress) {
        console.log('❌ ChatBubble: userAddress가 없음');
        return;
      }

      setIsLoadingProfile(true);
      console.log('🔄 ChatBubble: 프로필 조회 시작:', userAddress);
      
      try {
        // 캐시 무효화를 위해 timestamp 추가
        const cacheBuster = Date.now();
        const response = await fetch(`/api/profiles?wallet_address=${encodeURIComponent(userAddress)}&_=${cacheBuster}`, {
          cache: 'no-cache' // 브라우저 캐시도 무시
        });
        console.log('📡 ChatBubble: API 응답 상태:', response.status);
        
        if (!response.ok) {
          console.error('❌ ChatBubble: API 응답 실패:', response.status, response.statusText);
          return;
        }

        const result = await response.json();
        console.log('📥 ChatBubble: 프로필 API 응답:', result);
        
        if (result.success && result.profile) {
          setUserProfile(result.profile);
          console.log('✅ ChatBubble: 프로필 로드 성공:', result.profile);
        } else {
          console.log('ℹ️ ChatBubble: 프로필이 없음');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('❌ ChatBubble: 프로필 조회 중 오류:', error);
        setUserProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [userAddress, profileFetchTime]);

  // 프로필 업데이트 감지를 위한 이벤트 리스너 추가
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedWalletAddress = event.detail?.walletAddress;
      
      // 현재 메시지의 사용자 프로필이 업데이트된 경우 새로고침
      if (updatedWalletAddress === userAddress) {
        console.log('🔄 ChatBubble: 프로필 업데이트 감지, 새로고침:', userAddress);
        setProfileFetchTime(Date.now());
      }
    };

    // 전역 프로필 업데이트 이벤트 리스너
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [userAddress]);

  // 디버깅용 로그
  useEffect(() => {
    console.log('🐞 ChatBubble 상태:', {
      userAddress,
      nickname,
      avatar,
      userProfile,
      isLoadingProfile,
      hasAvatarUrl: !!userProfile?.avatar_url,
      profileAvatarUrl: userProfile?.avatar_url
    });
  }, [userAddress, nickname, avatar, userProfile, isLoadingProfile]);

  const amount = tradeAmount || '0';
  
  // 메시지 내용에서 이모지나 기타 자동 추가된 문구 제거
  const cleanContent = (text: string): string => {
    if (!text) return '';
    
    // 거래 관련 자동 생성 텍스트 패턴들을 모두 제거
    return text
      // 1. 시작/끝 이모지 제거
      .replace(/^(🚀|📈|📉|💰|⚡|🎯|🔥|💎|🌙|🟢|🔴|💸|📊|🎉|🎯|🦄|⭐|✨)\s*/g, '')
      .replace(/\s*(🚀|📈|📉|💰|⚡|🎯|🔥|💎|🌙|🟢|🔴|💸|📊|🎉|🎯|🦄|⭐|✨)$/g, '')
      
      // 2. "BUY/SELL 수량 완료!" 패턴 제거
      .replace(/\s*(BUY|SELL|買入|賣出|매수|매도)\s*수량\s*완료!?\s*/gi, '')
      .replace(/\s*(BUY|SELL)\s*\w+\s*0\.001\s*SOL\s*→\s*[\d,]+\.?\d*\s*\w+/gi, '')
      
      // 3. "±숫자 SOL" 패턴 제거
      .replace(/(\+|-|＋|－)?\s*\d+(\.\d+)?\s*SOL/gi, '')
      
      // 4. "숫자 SOL → 숫자 토큰" 패턴 제거
      .replace(/\d+(\.\d+)?\s*SOL\s*→\s*[\d,]+\.?\d*\s*\w+/gi, '')
      
      // 5. 거래 관련 자동 텍스트 제거
      .replace(/(bought|sold|매수|매도|구매|판매|purchased|acquired)\s*\d+(\.\d+)?\s*(SOL|sol)/gi, '')
      
      // 6. "수량 안내" 텍스트 제거
      .replace(/\s*수량\s*안내\s*/gi, '')
      
      // 7. 화살표와 토큰 변환 정보 제거
      .replace(/\s*→\s*[\d,]+\.?\d*\s*\w+/g, '')
      
      // 8. 콜론과 숫자들 제거 (거래 ID 등)
      .replace(/:\s*[\d,]+\.?\d*/g, '')
      
      // 9. 중복 공백 및 특수문자 정리
      .replace(/\s+/g, ' ')
      .replace(/[:\-_=]+/g, '')
      .trim();
  };

  // 아바타 표시 로직 개선 (DB에서 조회한 프로필 우선 사용)
  const displayAvatar = () => {
    console.log('🖼️ displayAvatar 호출:', {
      userProfile: userProfile?.avatar_url,
      messageAvatar: avatar,
      userAddress
    });

    // 1. DB에서 조회한 프로필 아바타 우선 사용
    if (userProfile?.avatar_url) {
      // emoji: 접두사가 있으면 제거
      const profileAvatar = userProfile.avatar_url.startsWith('emoji:') 
        ? userProfile.avatar_url.replace('emoji:', '') 
        : userProfile.avatar_url;
      
      console.log('✅ 프로필 아바타 사용:', profileAvatar);
      
      // 이모지인 경우 AvatarImage로 표시하지 않음
      if (profileAvatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(profileAvatar)) {
        console.log('🎭 프로필 아바타가 이모지임, null 반환');
        return null;
      }
      return profileAvatar;
    }
    
    // 2. 메시지에 포함된 아바타 사용 (fallback)
    if (avatar) {
      console.log('🔄 메시지 아바타 사용:', avatar);
      return avatar.startsWith('emoji:') ? avatar.replace('emoji:', '') : avatar;
    }
    
    // 3. 기본값
    console.log('🔄 기본 아바타 사용');
    return null;
  };

  // 닉네임 표시 (DB에서 조회한 프로필 우선 사용)
  const displayName = userProfile?.nickname || 
    nickname || 
    (userAddress ? `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}` : '익명');

  // 아바타 fallback 처리 (이모지용)
  const displayAvatarFallback = () => {
    console.log('🔤 displayAvatarFallback 호출:', {
      userProfile: userProfile?.avatar_url,
      messageAvatar: avatar,
      userAddress
    });

    // 1. DB에서 조회한 프로필 아바타 우선
    if (userProfile?.avatar_url) {
      const profileAvatar = userProfile.avatar_url.startsWith('emoji:') 
        ? userProfile.avatar_url.replace('emoji:', '') 
        : userProfile.avatar_url;
      
      if (profileAvatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(profileAvatar)) {
        console.log('✅ 프로필 이모지 fallback 사용:', profileAvatar);
        return profileAvatar;
      }
    }
    
    // 2. 메시지 아바타 사용
    if (avatar && avatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(avatar)) {
      console.log('🔄 메시지 이모지 fallback 사용:', avatar);
      return avatar;
    }
    
    // 3. 지갑 주소 기반 fallback
    const fallback = userAddress ? userAddress.slice(2, 4).toUpperCase() : '?';
    console.log('🔤 지갑주소 기반 fallback 사용:', fallback);
    return fallback;
  };
  
  return (
    <Card className="max-w-md mb-4 border-2 border-[oklch(0_0_0)] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[oklch(67.56%_0.1796_49.61)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0 transition-none p-0 min-h-fit h-auto">
      <CardContent className="p-4 min-h-fit h-auto w-full">
        <div className="flex items-start gap-3">
          {/* 프로필 아바타 */}
          <div className="relative">
            <OptimizedAvatar
              src={displayAvatar()}
              fallback={displayAvatarFallback()}
              alt={displayName}
              className="w-12 h-12 border-2 border-[oklch(0_0_0)]"
              priority={true}
            />
            {/* 로딩 인디케이터 */}
            {isLoadingProfile && (
              <div className="absolute inset-0 bg-black bg-opacity-20 rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-between flex-1 h-12">
            {/* 사용자 이름 */}
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-[oklch(0%_0_0)] text-base">
                {displayName}
                {isLoadingProfile && <span className="text-xs opacity-50"> (로딩중...)</span>}
              </h4>
              {amount && amount !== '0' && (
                <Badge 
                  variant="neutral"
                  className={`w-fit h-5 px-2 py-0 text-xs font-semibold rounded-none border cursor-default transition-none flex items-center ${
                    tradeType === 'sell' 
                      ? 'bg-red-100 text-red-700 border-[oklch(0_0_0)]' 
                      : 'bg-green-100 text-green-700 border-[oklch(0_0_0)]'
                  }`}
                  style={{ boxShadow: 'none' }}
                >
                  {tradeType === 'sell' ? 'SELL' : 'BUY'} {amount} SOL
                </Badge>
              )}
            </div>
            
            {/* 실제 사용자 입력 텍스트만 표시 */}
            {cleanContent(content) && (
              <div className="w-full overflow-hidden">
                <p className="text-sm text-[oklch(0%_0_0)] leading-tight break-all line-clamp-1" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                  {cleanContent(content)}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 