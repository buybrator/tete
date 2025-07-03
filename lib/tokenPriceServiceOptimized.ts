import { supabase } from './supabase';
import type { Database } from './supabase';

type TokenPriceHistoryInsert = Database['public']['Tables']['token_price_history']['Insert'];

// 🎯 Rate Limiting 및 큐 시스템 설정
const JUPITER_API_RATE_LIMIT = 10; // 초당 10개 요청
const REQUEST_INTERVAL = 1000 / JUPITER_API_RATE_LIMIT; // 100ms 간격
const MAX_RETRIES = 3;
const BATCH_SIZE = 5; // 배치당 토큰 수
const CACHE_DURATION = 30 * 1000; // 30초 캐싱

// 🚀 요청 큐 인터페이스
interface PriceRequest {
  tokenAddress: string;
  resolve: (price: number | null) => void;
  reject: (error: Error) => void;
  retryCount: number;
  timestamp: number;
}

// 가격 캐시 인터페이스
interface PriceCache {
  price: number;
  timestamp: number;
}

// 📊 최적화된 토큰 가격 서비스
export class OptimizedTokenPriceService {
  private requestQueue: PriceRequest[] = [];
  private isProcessing = false;
  private priceCache = new Map<string, PriceCache>();
  private lastRequestTime = 0;

  constructor() {
    // 큐 처리 시작
    this.startQueueProcessor();
    
    // 캐시 정리 (5분마다)
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  /**
   * 15분 단위로 시간을 정규화합니다
   */
  private normalize15MinTimestamp(date: Date): string {
    const normalized = new Date(date);
    const minutes = normalized.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    normalized.setMinutes(roundedMinutes, 0, 0);
    return normalized.toISOString();
  }

  /**
   * 캐시에서 가격 조회
   */
  private getCachedPrice(tokenAddress: string): number | null {
    const cached = this.priceCache.get(tokenAddress);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`🎯 가격 캐시 히트: ${tokenAddress}`);
      return cached.price;
    }
    return null;
  }

  /**
   * 가격 캐시에 저장
   */
  private setCachedPrice(tokenAddress: string, price: number) {
    this.priceCache.set(tokenAddress, {
      price,
      timestamp: Date.now()
    });
  }

  /**
   * 오래된 캐시 정리
   */
  private cleanupCache() {
    const now = Date.now();
    for (const [tokenAddress, cache] of this.priceCache.entries()) {
      if (now - cache.timestamp > CACHE_DURATION) {
        this.priceCache.delete(tokenAddress);
      }
    }
    console.log(`🧹 가격 캐시 정리 완료, 현재 크기: ${this.priceCache.size}`);
  }

  /**
   * Rate Limiting을 적용한 큐 처리기
   */
  private async startQueueProcessor() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      if (this.requestQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Rate Limiting 적용
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < REQUEST_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, REQUEST_INTERVAL - timeSinceLastRequest)
        );
      }

      // 큐에서 요청 가져오기
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        // 캐시 확인
        const cachedPrice = this.getCachedPrice(request.tokenAddress);
        if (cachedPrice !== null) {
          request.resolve(cachedPrice);
          continue;
        }

        // Jupiter API 호출
        const price = await this.fetchJupiterPriceWithRetry(
          request.tokenAddress, 
          request.retryCount
        );
        
        if (price !== null) {
          this.setCachedPrice(request.tokenAddress, price);
          request.resolve(price);
        } else {
          request.reject(new Error('가격 조회 실패'));
        }

        this.lastRequestTime = Date.now();

      } catch (error) {
        // 재시도 로직
        if (request.retryCount < MAX_RETRIES) {
          request.retryCount++;
          // 백오프: 2^retry * 1초
          const delay = Math.pow(2, request.retryCount) * 1000;
          setTimeout(() => {
            this.requestQueue.unshift(request);
          }, delay);
          console.warn(`⏳ 가격 조회 재시도 (${request.retryCount}/${MAX_RETRIES}): ${request.tokenAddress}`);
        } else {
          request.reject(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    }
  }

  /**
   * 재시도 로직이 포함된 Jupiter API 호출
   */
     private async fetchJupiterPriceWithRetry(tokenAddress: string, retryCount: number): Promise<number | null> {
     try {
       // AbortController로 타임아웃 구현
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
       
       const response = await fetch(
         `https://lite-api.jup.ag/price/v2?ids=${tokenAddress}&showExtraInfo=true`,
         {
           signal: controller.signal,
           headers: {
             'User-Agent': 'TradeChatApp/1.0',
             'Accept': 'application/json'
           }
         }
       );
       
       clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit - 더 긴 대기
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const tokenData = data.data[tokenAddress];

      if (tokenData && tokenData.price) {
        const price = parseFloat(tokenData.price);
        console.log(`✅ 가격 조회 성공: ${tokenAddress} = $${price}`);
        return price;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Jupiter API 오류 (재시도 ${retryCount}):`, error);
      throw error;
    }
  }

  /**
   * 비동기 가격 조회 (큐 시스템 사용)
   */
  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
      // 기존 요청이 있는지 확인
      const existingRequest = this.requestQueue.find(req => req.tokenAddress === tokenAddress);
      if (existingRequest) {
        console.log(`⏳ 기존 요청 대기 중: ${tokenAddress}`);
        return;
      }

      this.requestQueue.push({
        tokenAddress,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      });

      console.log(`📥 가격 요청 큐에 추가: ${tokenAddress} (큐 크기: ${this.requestQueue.length})`);
    });
  }

  /**
   * 배치 가격 업데이트 (순차 처리)
   */
  async updateMultipleTokenPrices(tokenAddresses: string[]): Promise<{
    successful: number;
    failed: string[];
    total: number;
  }> {
    console.log(`🚀 배치 가격 업데이트 시작: ${tokenAddresses.length}개 토큰`);
    
    const results = {
      successful: 0,
      failed: [] as string[],
      total: tokenAddresses.length
    };

    // 배치 단위로 처리
    for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
      const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
      
      console.log(`📦 배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 중: ${batch.length}개 토큰`);

      // 배치 내에서 병렬 처리 (Rate Limit 고려)
      const batchPromises = batch.map(async (tokenAddress) => {
        try {
          const success = await this.updateTokenPrice(tokenAddress);
          if (success) {
            results.successful++;
          } else {
            results.failed.push(tokenAddress);
          }
        } catch (error) {
          results.failed.push(tokenAddress);
          console.error(`토큰 ${tokenAddress} 업데이트 실패:`, error);
        }
      });

      await Promise.all(batchPromises);

      // 배치 간 대기 (API 부하 방지)
      if (i + BATCH_SIZE < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      }
    }

    console.log(`✅ 배치 가격 업데이트 완료: ${results.successful}/${results.total} 성공`);
    return results;
  }

  /**
   * 단일 토큰 가격 업데이트
   */
  async updateTokenPrice(tokenAddress: string): Promise<boolean> {
    try {
      const currentPrice = await this.getTokenPrice(tokenAddress);
      if (!currentPrice) {
        console.warn(`가격 데이터를 가져올 수 없습니다: ${tokenAddress}`);
        return false;
      }

      const timestamp15min = this.normalize15MinTimestamp(new Date());

      // 기존 데이터 확인
      const { data: existingData } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .eq('timestamp_15min', timestamp15min)
        .single();

      if (existingData) {
        // OHLC 업데이트
        const updatedData = {
          price: currentPrice,
          close_price: currentPrice,
          high_price: Math.max(existingData.high_price, currentPrice),
          low_price: Math.min(existingData.low_price, currentPrice),
        };

        const { error } = await supabase
          .from('token_price_history')
          .update(updatedData)
          .eq('id', existingData.id);

        if (error) {
          console.error('가격 업데이트 실패:', error);
          return false;
        }
      } else {
        // 새 데이터 삽입
        const newData: TokenPriceHistoryInsert = {
          token_address: tokenAddress,
          price: currentPrice,
          open_price: currentPrice,
          high_price: currentPrice,
          low_price: currentPrice,
          close_price: currentPrice,
          timestamp_15min: timestamp15min,
          volume: 0,
        };

        const { error } = await supabase
          .from('token_price_history')
          .insert(newData);

        if (error) {
          console.error('새 가격 데이터 삽입 실패:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('토큰 가격 업데이트 오류:', error);
      return false;
    }
  }

  /**
   * 큐 상태 조회
   */
  getQueueStats() {
    return {
      queueSize: this.requestQueue.length,
      cacheSize: this.priceCache.size,
      isProcessing: this.isProcessing,
      oldestRequestAge: this.requestQueue.length > 0 
        ? Date.now() - this.requestQueue[0].timestamp 
        : 0
    };
  }

  /**
   * 서비스 정리
   */
  destroy() {
    this.isProcessing = false;
    this.requestQueue.length = 0;
    this.priceCache.clear();
  }
}

// 싱글톤 인스턴스
export const optimizedTokenPriceService = new OptimizedTokenPriceService();

export default optimizedTokenPriceService; 