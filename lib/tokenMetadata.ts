'use client';

import { 
  findMetadataPda,
  fetchMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';

// 🌟 Solana 토큰 메타데이터 인터페이스
export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
  };
}

// 🌟 토큰 메타데이터 조회 에러 타입
export class TokenMetadataError extends Error {
  constructor(
    message: string,
    public readonly tokenAddress: string,
    public readonly step: 'metadata' | 'uri' | 'json' | 'image'
  ) {
    super(message);
    this.name = 'TokenMetadataError';
  }
}

/**
 * 🎯 토큰 주소로부터 메타데이터 조회
 * @param tokenAddress - 조회할 토큰의 주소
 * @returns TokenMetadata 또는 null
 */
export async function fetchTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata | null> {
  try {
    console.log(`🔍 토큰 메타데이터 조회 시작: ${tokenAddress}`);

    // RPC URL 설정
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/CLIspK_3J2GVAuweafRIUoHzWjyn07rz';
    
    // UMI 인스턴스 생성
    const umi = createUmi(rpcUrl);
    
    // 토큰 주소를 UMI PublicKey로 변환
    const mintPublicKey = publicKey(tokenAddress);

    // 메타데이터 PDA 계산
    const metadataAddress = findMetadataPda(umi, { mint: mintPublicKey });
    console.log(`📍 메타데이터 PDA: ${metadataAddress[0]}`);

    // 메타데이터 조회
    const metadata = await fetchMetadata(umi, metadataAddress[0]);
    console.log(`✅ 메타데이터 조회 성공:`, {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri
    });

    // URI에서 JSON 메타데이터 조회
    if (!metadata.uri) {
      console.log(`❌ URI 필드가 비어있음: ${tokenAddress}`);
      return null;
    }

    console.log(`🌐 JSON 메타데이터 조회: ${metadata.uri}`);
    
    // CORS 문제를 해결하기 위해 우리의 API 엔드포인트 사용
    const apiUrl = `/api/token-metadata?uri=${encodeURIComponent(metadata.uri)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new TokenMetadataError(
        `Failed to fetch JSON metadata: ${response.status}`,
        tokenAddress,
        'json'
      );
    }

    const jsonMetadata = await response.json();
    console.log(`✅ JSON 메타데이터 조회 성공:`, jsonMetadata);

    // 이미지 URL 검증 (있는 경우에만)
    let imageUrl = jsonMetadata.image;
    if (imageUrl) {
      try {
        // 이미지 URL 접근 가능 여부 확인
        const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (!imageResponse.ok) {
          console.warn(`⚠️  이미지 URL 접근 불가: ${imageUrl}`);
          imageUrl = undefined;
        } else {
          console.log(`✅ 이미지 URL 검증 완료: ${imageUrl}`);
        }
      } catch (error) {
        console.warn(`⚠️  이미지 URL 검증 실패: ${imageUrl}`, error);
        imageUrl = undefined;
      }
    }

    // 결과 반환
    const result: TokenMetadata = {
      mint: tokenAddress,
      name: metadata.name.replace(/\0/g, '').trim(), // null bytes 제거
      symbol: metadata.symbol.replace(/\0/g, '').trim(),
      description: jsonMetadata.description,
      image: imageUrl,
      attributes: jsonMetadata.attributes,
      external_url: jsonMetadata.external_url,
      animation_url: jsonMetadata.animation_url,
      properties: jsonMetadata.properties
    };

    console.log(`🎉 토큰 메타데이터 조회 완료:`, result);
    return result;

  } catch (error) {
    console.error(`❌ 토큰 메타데이터 조회 실패 [${tokenAddress}]:`, error);
    
    if (error instanceof TokenMetadataError) {
      throw error;
    }
    
    // 알 수 없는 에러
    throw new TokenMetadataError(
      `Unknown error: ${error instanceof Error ? error.message : 'Unknown'}`,
      tokenAddress,
      'metadata'
    );
  }
}

/**
 * 🖼️ 이미지를 Blob으로 변환
 * @param imageUrl - 변환할 이미지 URL
 * @returns Blob 객체 또는 null
 */
export async function convertImageToBlob(imageUrl: string): Promise<Blob | null> {
  try {
    console.log(`🖼️  이미지 Blob 변환 시작: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    console.log(`✅ 이미지 Blob 변환 완료: ${blob.size} bytes, ${blob.type}`);
    
    return blob;
  } catch (error) {
    console.error(`❌ 이미지 Blob 변환 실패:`, error);
    return null;
  }
}

/**
 * 🎯 토큰 주소로부터 이미지 URL 추출 (간단 버전)
 * @param tokenAddress - 토큰 주소
 * @returns 이미지 URL 또는 null
 */
export async function getTokenImageUrl(
  tokenAddress: string
): Promise<string | null> {
  try {
    const metadata = await fetchTokenMetadata(tokenAddress);
    return metadata?.image || null;
  } catch (error) {
    console.error(`❌ 토큰 이미지 URL 조회 실패 [${tokenAddress}]:`, error);
    return null;
  }
}

/**
 * 🔄 토큰 메타데이터 조회 재시도 로직 (Fallback 포함)
 * @param tokenAddress - 토큰 주소 
 * @param maxRetries - 최대 재시도 횟수
 * @returns TokenMetadata 또는 null
 */
export async function fetchTokenMetadataWithRetry(
  tokenAddress: string,
  maxRetries: number = 3
): Promise<TokenMetadata | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 토큰 메타데이터 조회 시도 ${attempt}/${maxRetries}: ${tokenAddress}`);
      
      const result = await fetchTokenMetadata(tokenAddress);
      // null이 반환되면 메타데이터가 없는 것으로 간주하고 즉시 반환
      if (result === null) {
        console.log(`ℹ️  토큰 메타데이터 없음: ${tokenAddress}`);
        return null;
      }
      
      if (result) {
        console.log(`✅ 토큰 메타데이터 조회 성공 (시도 ${attempt}): ${tokenAddress}`);
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️  토큰 메타데이터 조회 실패 (시도 ${attempt}): ${error}`);
      
      if (attempt < maxRetries) {
        // 지수 백오프: 1초, 2초, 4초...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ ${delay}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ 모든 재시도 실패. 토큰: ${tokenAddress}`, lastError);
  return null;
}

export default {
  fetchTokenMetadata,
  fetchTokenMetadataWithRetry,
  convertImageToBlob,
  getTokenImageUrl,
  TokenMetadataError
}; 