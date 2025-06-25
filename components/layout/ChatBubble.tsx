import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  const { avatar, tradeAmount, content, userAddress, nickname, timestamp, tradeType } = message;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 프로필 정보 조회
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles?wallet_address=${encodeURIComponent(userAddress)}`);
        const result = await response.json();
        
        if (result.success && result.profile) {
          setUserProfile(result.profile);
        }
      } catch (error) {
        console.error('프로필 조회 실패:', error);
      }
    };

    if (userAddress) {
      fetchProfile();
    }
  }, [userAddress]);
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
    // 1. DB에서 조회한 프로필 아바타 우선 사용
    if (userProfile?.avatar_url) {
      // emoji: 접두사가 있으면 제거
      const profileAvatar = userProfile.avatar_url.startsWith('emoji:') 
        ? userProfile.avatar_url.replace('emoji:', '') 
        : userProfile.avatar_url;
      
      // 이모지인 경우 AvatarImage로 표시하지 않음
      if (profileAvatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(profileAvatar)) {
        return null;
      }
      return profileAvatar;
    }
    
    // 2. 메시지에 포함된 아바타 사용 (fallback)
    if (avatar) {
      if (avatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(avatar)) {
        return null;
      }
      return avatar;
    }
    return null;
  };

  // 닉네임 표시 (DB에서 조회한 프로필 우선 사용)
  const displayName = userProfile?.nickname || 
    nickname || 
    (userAddress ? `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}` : '익명');

  // 아바타 fallback 처리 (이모지용)
  const displayAvatarFallback = () => {
    // 1. DB에서 조회한 프로필 아바타 우선
    if (userProfile?.avatar_url) {
      const profileAvatar = userProfile.avatar_url.startsWith('emoji:') 
        ? userProfile.avatar_url.replace('emoji:', '') 
        : userProfile.avatar_url;
      
      if (profileAvatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(profileAvatar)) {
        return profileAvatar;
      }
    }
    
    // 2. 메시지 아바타 사용
    if (avatar && avatar.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(avatar)) {
      return avatar;
    }
    
    // 3. 지갑 주소 기반 fallback
    return userAddress ? userAddress.slice(2, 4).toUpperCase() : '?';
  };
  
  return (
    <Card className="max-w-md mb-4 border-2 border-[oklch(0_0_0)] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[oklch(67.56%_0.1796_49.61)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0 transition-none p-0 min-h-fit h-auto">
      <CardContent className="p-4 min-h-fit h-auto w-full">
        <div className="flex items-start gap-3">
          {/* 프로필 아바타 */}
          <Avatar className="w-12 h-12 border-2 border-[oklch(0_0_0)]">
            {displayAvatar() && (
              <AvatarImage src={displayAvatar()!} alt={displayName} />
            )}
            <AvatarFallback className="text-sm font-bold bg-gray-100 text-[oklch(0%_0_0)]">
              {displayAvatarFallback()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col gap-2 flex-1">
            {/* 사용자 이름 */}
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-[oklch(0%_0_0)] text-base">{displayName}</h4>
              
              {/* SOL 거래량 배지와 시간 */}
              <div className="flex items-center justify-between">
                {amount && amount !== '0' && (
                  <Badge 
                    variant="neutral"
                    className={`w-fit text-xs font-semibold rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-default transition-none ${
                      tradeType === 'sell' 
                        ? 'bg-red-100 text-red-700 border-[oklch(0_0_0)]' 
                        : 'bg-green-100 text-green-700 border-[oklch(0_0_0)]'
                    }`}
                  >
                    {tradeType === 'sell' ? 'SELL' : 'BUY'} {amount} SOL
                  </Badge>
                )}
                
                {/* 시간 표시 (시:분 형태) */}
                {timestamp && (
                  <span className="text-xs text-[oklch(0%_0_0)] ml-auto">
                    {timestamp.toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })}
                  </span>
                )}
              </div>
            </div>
            
            {/* 실제 사용자 입력 텍스트만 표시 */}
            {cleanContent(content) && (
              <div className="mt-2 w-full overflow-hidden">
                <p className="text-sm text-[oklch(0%_0_0)] leading-relaxed break-all min-h-fit max-w-full" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
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