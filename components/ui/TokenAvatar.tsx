'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchTokenMetadataWithRetry } from '@/lib/tokenMetadata';

interface TokenAvatarProps {
  tokenAddress: string;
  tokenName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // 채팅방에서 미리 조회한 이미지 URL (우선사용)
  imageUrl?: string | null;
}

interface JupiterTokenMetadata {
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  image?: string;
}

export default function TokenAvatar({ 
  tokenAddress, 
  tokenName = 'Token', 
  size = 'md',
  className = '',
  imageUrl // 채팅방에서 전달받은 이미지 URL
}: TokenAvatarProps) {
  console.log(`🎯 TokenAvatar 렌더링:`, { tokenAddress, tokenName, size, imageUrl });
  
  const [imageError, setImageError] = useState(false);
  const [metaplexMetadata, setMetaplexMetadata] = useState<{
    name: string;
    symbol: string;
    image?: string;
  } | null>(null);
  const [jupiterMetadata, setJupiterMetadata] = useState<JupiterTokenMetadata | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  
  // 크기 설정
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-16 w-16'
  };

  const iconSizes = {
    sm: 32,
    md: 48,
    lg: 64
  };

  // 🎯 Metaplex 메타데이터 조회 (우선순위 1)
  useEffect(() => {
    // 채팅방에서 이미지 URL이 제공되고 유효한 HTTP URL인 경우 메타데이터 조회 건너뜀
    if (imageUrl && imageUrl.startsWith('http') && !fallbackActive) {
      console.log(`✅ 채팅방 이미지 URL 사용 (Metaplex 건너뜀): ${imageUrl}`);
      return;
    }

    const fetchMetaplexMetadata = async () => {
      try {
        console.log(`🔍 Metaplex 토큰 메타데이터 조회 시작: ${tokenAddress}`);
        const metadata = await fetchTokenMetadataWithRetry(tokenAddress, 2);
        
        if (metadata && metadata.image) {
          console.log(`✅ Metaplex 메타데이터 조회 성공:`, metadata);
          setMetaplexMetadata(metadata);
          return; // Metaplex에서 성공하면 Jupiter 호출 안함
        } else {
          console.log(`⚠️ Metaplex에서 이미지 없음, Jupiter 시도: ${tokenAddress}`);
        }
      } catch (error) {
        console.warn(`⚠️ Metaplex 조회 실패, Jupiter 시도:`, error);
      }

      // Metaplex 실패 시 Jupiter Token List 시도 (fallback)
      try {
        console.log(`🪙 Jupiter Token List에서 토큰 메타데이터 조회 시작: ${tokenAddress}`);
        const response = await fetch('https://token.jup.ag/strict');
        const tokens = await response.json();
        
        const token = tokens.find((t: JupiterTokenMetadata) => t.address === tokenAddress);
        if (token) {
          console.log(`✅ Jupiter 토큰 메타데이터 발견:`, token);
          setJupiterMetadata(token);
        } else {
          console.log(`❌ Jupiter Token List에서 토큰 메타데이터 없음: ${tokenAddress}`);
        }
      } catch (error) {
        console.log('❌ Jupiter Token List 조회 실패:', error);
      }
    };

    if (tokenAddress && (fallbackActive || !imageUrl || !imageUrl.startsWith('http'))) {
      fetchMetaplexMetadata();
    }
  }, [tokenAddress, imageUrl, fallbackActive]);

  // Jupiter Pro 스타일의 이미지 URL 생성
  const getOptimizedImageUrl = (originalUrl: string) => {
    const imageSize = iconSizes[size];
    return `https://wsrv.nl/?w=${imageSize}&h=${imageSize}&url=${encodeURIComponent(originalUrl)}&dpr=2&quality=80`;
  };

  // 다중 이미지 소스 생성 (우선순위 순)
  const getImageSources = () => {
    const sources: string[] = [];
    
    // 1. 채팅방에서 제공된 이미지 URL (최우선)
    if (imageUrl && !fallbackActive) {
      // URL인지 이모지인지 확인
      if (imageUrl.startsWith('http') || imageUrl.startsWith('//')) {
        sources.push(getOptimizedImageUrl(imageUrl));
        console.log(`🎯 채팅방 이미지 URL 사용: ${imageUrl}`);
      } else {
        // 이모지나 기타 텍스트인 경우 fallback 활성화
        console.log(`🎭 이모지 감지, fallback 활성화: ${imageUrl}`);
        setFallbackActive(true);
        return []; // 이모지는 이미지로 처리하지 않고 fallback으로
      }
    }
    
    // 2. Metaplex 메타데이터의 이미지 URL (우선순위 2)
    if ((fallbackActive || !imageUrl || !imageUrl.startsWith('http')) && metaplexMetadata?.image) {
      sources.push(getOptimizedImageUrl(metaplexMetadata.image));
      console.log(`🎯 Metaplex 이미지 URL 사용: ${metaplexMetadata.image}`);
    }
    
    // 3. Jupiter Token List의 logoURI (우선순위 3)
    if ((fallbackActive || !imageUrl || !imageUrl.startsWith('http')) && jupiterMetadata?.logoURI) {
      sources.push(getOptimizedImageUrl(jupiterMetadata.logoURI));
      console.log(`🪙 Jupiter 이미지 URL 사용: ${jupiterMetadata.logoURI}`);
    }
    
    // 4. Jupiter Static Images API (우선순위 4)
    if (fallbackActive || !imageUrl || !imageUrl.startsWith('http')) {
      const jupiterStaticUrl = `https://static.jup.ag/images/${tokenAddress}.png`;
      sources.push(getOptimizedImageUrl(jupiterStaticUrl));
    }
    
    // 5. Solana Token List (GitHub) (우선순위 5)
    if (fallbackActive || !imageUrl || !imageUrl.startsWith('http')) {
      const solanaTokenListUrl = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${tokenAddress}/logo.png`;
      sources.push(getOptimizedImageUrl(solanaTokenListUrl));
    }
    
    console.log(`🔗 이미지 소스 리스트:`, sources);
    return sources;
  };

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const imageSources = getImageSources();

  // 이미지 소스가 변경될 때 인덱스 리셋
  useEffect(() => {
    setCurrentUrlIndex(0);
    setImageError(false);
  }, [imageSources.length, imageUrl, fallbackActive, metaplexMetadata, jupiterMetadata]);

  const handleImageError = () => {
    console.log(`❌ 이미지 로딩 실패 [${currentUrlIndex}]: ${imageSources[currentUrlIndex]}`);
    
    // 채팅방 이미지가 실패하면 fallback 활성화
    if (!fallbackActive && imageUrl && imageUrl.startsWith('http')) {
      console.log(`🔄 채팅방 이미지 실패, fallback 모드 활성화`);
      setFallbackActive(true);
      return;
    }
    
    if (currentUrlIndex < imageSources.length - 1) {
      setCurrentUrlIndex(prev => prev + 1);
      console.log(`🔄 다음 이미지 소스 시도 [${currentUrlIndex + 1}]: ${imageSources[currentUrlIndex + 1]}`);
    } else {
      console.log(`❌ 모든 이미지 소스 실패. 폴백 표시: ${getAvatarFallback(tokenName)}`);
      setImageError(true);
    }
  };

  // 토큰 이름의 첫 글자들을 폴백으로 사용 (Jupiter Pro 스타일)
  const getAvatarFallback = (name: string) => {
    // 채팅방 이미지가 이모지인 경우 그대로 사용
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
      return imageUrl;
    }
    
    // Metaplex 메타데이터에서 이름 사용 (우선)
    const displayName = metaplexMetadata?.symbol || metaplexMetadata?.name || 
                       jupiterMetadata?.symbol || jupiterMetadata?.name || name;
    return displayName
      .split(/[\s\/]/)
      .slice(0, 2)
      .map((word: string) => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  // 현재 사용할 이미지 URL 결정
  const currentImageUrl = imageSources.length > 0 ? imageSources[currentUrlIndex] : undefined;

  console.log(`🖼️  최종 렌더링:`, {
    currentImageUrl,
    fallback: getAvatarFallback(tokenName),
    imageError,
    fallbackActive,
    metaplexImage: metaplexMetadata?.image,
    jupiterImage: jupiterMetadata?.logoURI
  });

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {currentImageUrl && !imageError && (
        <AvatarImage 
          src={currentImageUrl} 
          alt={tokenName}
          onError={handleImageError}
        />
      )}
      <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
        {getAvatarFallback(tokenName)}
      </AvatarFallback>
    </Avatar>
  );
} 