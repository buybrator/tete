'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchTokenMetadataWithRetry } from '@/lib/tokenMetadata';
import { ImageCacheManager } from '@/lib/utils';

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
      // 이미지 프리로딩
      ImageCacheManager.preload(imageUrl);
      return;
    }

    const fetchMetaplexMetadata = async () => {
      try {
        // Metaplex와 Jupiter를 병렬로 조회
        const [metaplexResult, jupiterResult] = await Promise.allSettled([
          // Metaplex 조회
          fetchTokenMetadataWithRetry(tokenAddress, 2),
          // Jupiter Token List 조회
          fetch('https://token.jup.ag/strict').then(res => res.json())
        ]);

        // Metaplex 결과 처리
        if (metaplexResult.status === 'fulfilled' && metaplexResult.value?.image) {
          console.log(`✅ Metaplex 메타데이터 조회 성공:`, metaplexResult.value);
          setMetaplexMetadata(metaplexResult.value);
          // 이미지 프리로딩
          ImageCacheManager.preload(metaplexResult.value.image);
        } else if (metaplexResult.status === 'fulfilled' && metaplexResult.value === null) {
          console.log(`ℹ️  Metaplex 메타데이터 없음: ${tokenAddress}`);
        } else if (metaplexResult.status === 'rejected') {
          console.warn(`⚠️  Metaplex 메타데이터 조회 실패:`, metaplexResult.reason);
        }

        // Jupiter 결과 처리
        if (jupiterResult.status === 'fulfilled') {
          const tokens = jupiterResult.value;
          const token = tokens.find((t: JupiterTokenMetadata) => t.address === tokenAddress);
          if (token) {
            console.log(`✅ Jupiter 토큰 메타데이터 발견:`, token);
            setJupiterMetadata(token);
            // 이미지 프리로딩
            if (token.logoURI) {
              ImageCacheManager.preload(token.logoURI);
            }
          }
        }
      } catch (error) {
        console.error('❌ 메타데이터 조회 실패:', error);
      }
    };

    if (tokenAddress && (fallbackActive || !imageUrl || !imageUrl.startsWith('http'))) {
      fetchMetaplexMetadata();
    }
  }, [tokenAddress, imageUrl, fallbackActive]);

  // Jupiter Pro 스타일의 이미지 URL 생성
  const getOptimizedImageUrl = (originalUrl: string) => {
    const imageSize = iconSizes[size];
    // 확장자가 없는 URL인 경우 기본 이미지 형식 지정
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(originalUrl);
    const optimizedUrl = `https://wsrv.nl/?w=${imageSize}&h=${imageSize}&url=${encodeURIComponent(originalUrl)}&dpr=2&quality=80`;
    
    // 확장자가 없는 경우 output 형식 지정
    if (!hasExtension) {
      return `${optimizedUrl}&output=png`;
    }
    
    return optimizedUrl;
  };

  // CORS 문제가 있는 URL을 위한 프록시 URL 생성
  const getProxiedImageUrl = (originalUrl: string) => {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  // 다중 이미지 소스 생성 (우선순위 순)
  const getImageSources = () => {
    const sources: string[] = [];
    
    // 1. 채팅방에서 제공된 이미지 URL (최우선)
    if (imageUrl && !fallbackActive) {
      // URL인지 이모지인지 확인
      if (imageUrl.startsWith('http') || imageUrl.startsWith('//')) {
        // 최적화된 URL, 프록시 URL, 원본 URL 순으로 추가
        sources.push(getOptimizedImageUrl(imageUrl));
        sources.push(getProxiedImageUrl(imageUrl));
        sources.push(imageUrl); // 원본 URL도 fallback으로 추가
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
      // 최적화된 URL, 프록시 URL, 원본 URL 순으로 추가
      sources.push(getOptimizedImageUrl(metaplexMetadata.image));
      sources.push(getProxiedImageUrl(metaplexMetadata.image));
      sources.push(metaplexMetadata.image); // 원본 URL도 fallback으로 추가
      console.log(`🎯 Metaplex 이미지 URL 사용: ${metaplexMetadata.image}`);
    }
    
    // 3. Jupiter Token List의 logoURI (우선순위 3)
    if ((fallbackActive || !imageUrl || !imageUrl.startsWith('http')) && jupiterMetadata?.logoURI) {
      // 최적화된 URL, 프록시 URL, 원본 URL 순으로 추가
      sources.push(getOptimizedImageUrl(jupiterMetadata.logoURI));
      sources.push(getProxiedImageUrl(jupiterMetadata.logoURI));
      sources.push(jupiterMetadata.logoURI); // 원본 URL도 fallback으로 추가
      console.log(`🪙 Jupiter 이미지 URL 사용: ${jupiterMetadata.logoURI}`);
    }
    
    // 4. Jupiter Static Images API (우선순위 4)
    if (fallbackActive || !imageUrl || !imageUrl.startsWith('http')) {
      const jupiterStaticUrl = `https://static.jup.ag/images/${tokenAddress}.png`;
      sources.push(getOptimizedImageUrl(jupiterStaticUrl));
      sources.push(getProxiedImageUrl(jupiterStaticUrl));
      sources.push(jupiterStaticUrl); // 원본 URL도 추가
    }
    
    // 5. Jupiter Create Static Images (확장자 없는 URL 직접 시도)
    if (fallbackActive || !imageUrl || !imageUrl.startsWith('http')) {
      const jupiterCreateStaticUrl = `https://static-create.jup.ag/images/${tokenAddress}`;
      sources.push(getOptimizedImageUrl(jupiterCreateStaticUrl));
      sources.push(getProxiedImageUrl(jupiterCreateStaticUrl));
      sources.push(jupiterCreateStaticUrl); // 원본 URL도 추가
    }
    
    // 6. Solana Token List (GitHub) (우선순위 6)
    if (fallbackActive || !imageUrl || !imageUrl.startsWith('http')) {
      const solanaTokenListUrl = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${tokenAddress}/logo.png`;
      sources.push(getOptimizedImageUrl(solanaTokenListUrl));
      sources.push(getProxiedImageUrl(solanaTokenListUrl));
      sources.push(solanaTokenListUrl); // 원본 URL도 추가
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