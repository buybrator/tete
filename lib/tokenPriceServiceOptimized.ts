import { supabaseAdmin } from './supabase'

// 배치 처리 설정
const BATCH_SIZE = 5
const BATCH_DELAY = 200 // ms
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

// 캐시 관리
const CACHE_DURATION = 30 * 1000 // 30초
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5분

interface PriceRequest {
  tokenAddress: string
  resolve: (price: number | null) => void
  reject: (error: Error) => void
  retryCount: number
  timestamp: number
}

interface CachedPrice {
  price: number
  timestamp: number
}

interface BatchUpdateResult {
  successful: number
  failed: number
  total: number
}

class TokenPriceServiceOptimized {
  private requestQueue: PriceRequest[] = []
  private processingQueue = false
  private pendingRequests = new Map<string, PriceRequest[]>()
  private priceCache = new Map<string, CachedPrice>()
  private lastCleanup = Date.now()

  // 가격 조회 (캐시 우선)
  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    // 캐시 확인
    const cached = this.priceCache.get(tokenAddress)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.price
    }

    // 이미 요청 중인지 확인
    if (this.pendingRequests.has(tokenAddress)) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.get(tokenAddress)!.push({
          tokenAddress,
          resolve,
          reject,
          retryCount: 0,
          timestamp: Date.now()
        })
      })
    }

    // 새 요청 생성
    return new Promise((resolve, reject) => {
      // 캐시 정리 (주기적)
      this.cleanupCache()

      const request: PriceRequest = {
        tokenAddress,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }

      // 대기열에 추가
      this.pendingRequests.set(tokenAddress, [request])
      this.requestQueue.push(request)

      // 큐 처리 시작
      this.processQueue()
    })
  }

  // 캐시 정리
  private cleanupCache() {
    const now = Date.now()
    if (now - this.lastCleanup < CACHE_CLEANUP_INTERVAL) return

    for (const [key, cached] of this.priceCache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION) {
        this.priceCache.delete(key)
      }
    }

    this.lastCleanup = now
  }

  // 큐 처리
  private async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return

    this.processingQueue = true

    try {
      while (this.requestQueue.length > 0) {
        const batch = this.requestQueue.splice(0, BATCH_SIZE)
        await this.processBatch(batch)
        
        // 배치 간 딜레이
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }
    } finally {
      this.processingQueue = false
    }
  }

  // 배치 처리
  private async processBatch(batch: PriceRequest[]) {
    const tokenAddresses = [...new Set(batch.map(req => req.tokenAddress))]
    
    try {
      const prices = await this.fetchPricesFromJupiter(tokenAddresses)
      
      // 결과 분배
      for (const request of batch) {
        const price = prices.get(request.tokenAddress)
        const pendingForToken = this.pendingRequests.get(request.tokenAddress)
        
        if (price !== undefined) {
          // 캐시 업데이트
          this.priceCache.set(request.tokenAddress, {
            price: price || 0,
            timestamp: Date.now()
          })

          // 모든 대기 중인 요청 처리
          if (pendingForToken) {
            pendingForToken.forEach(req => req.resolve(price))
            this.pendingRequests.delete(request.tokenAddress)
          }
        } else {
          // 재시도 또는 실패 처리
          await this.handleRequestFailure(request)
        }
      }
           } catch {
         // 배치 전체 실패 처리
         for (const request of batch) {
           await this.handleRequestFailure(request)
         }
       }
  }

  // 요청 실패 처리
  private async handleRequestFailure(request: PriceRequest) {
    if (request.retryCount < MAX_RETRIES) {
      request.retryCount++
      
      // 재시도 딜레이
      setTimeout(() => {
        this.requestQueue.push(request)
        this.processQueue()
      }, RETRY_DELAY * request.retryCount)
    } else {
      // 최대 재시도 초과
      const pendingForToken = this.pendingRequests.get(request.tokenAddress)
      if (pendingForToken) {
        pendingForToken.forEach(req => req.resolve(null))
        this.pendingRequests.delete(request.tokenAddress)
      }
    }
  }

  // Jupiter API에서 가격 조회
  private async fetchPricesFromJupiter(tokenAddresses: string[], retryCount = 0): Promise<Map<string, number | null>> {
    const prices = new Map<string, number | null>()
    
    try {
      const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddresses.join(',')}`)
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`)
      }

      const data = await response.json()
      
      for (const tokenAddress of tokenAddresses) {
        const tokenData = data.data?.[tokenAddress]
        if (tokenData?.price) {
          prices.set(tokenAddress, tokenData.price)
        } else {
          prices.set(tokenAddress, null)
        }
      }
      
      return prices
         } catch {
       if (retryCount < MAX_RETRIES) {
         await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
         return this.fetchPricesFromJupiter(tokenAddresses, retryCount + 1)
       }
       
       // 모든 토큰을 null로 설정
       tokenAddresses.forEach(address => prices.set(address, null))
       return prices
     }
  }

  // 기존 요청 대기 상태 확인
  public isRequestPending(tokenAddress: string): boolean {
    return this.pendingRequests.has(tokenAddress)
  }

  // 큐 상태 확인
  public getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      pendingTokens: this.pendingRequests.size,
      cacheSize: this.priceCache.size,
      isProcessing: this.processingQueue
    }
  }

  // 배치 가격 업데이트 (DB 저장용)
  async batchUpdatePrices(tokenAddresses: string[]): Promise<BatchUpdateResult> {
    const results: BatchUpdateResult = {
      successful: 0,
      failed: 0,
      total: tokenAddresses.length
    }

    // 배치 크기로 분할 처리
    for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
      const batch = tokenAddresses.slice(i, i + BATCH_SIZE)
      
      try {
        const prices = await this.fetchPricesFromJupiter(batch)
        
        // 개별 토큰 업데이트
        for (const tokenAddress of batch) {
          try {
            const price = prices.get(tokenAddress)
            if (price !== null && price !== undefined) {
              await this.updateTokenPrice(tokenAddress, price)
              results.successful++
            } else {
              results.failed++
            }
                     } catch {
             results.failed++
           }
                 }
       } catch {
         results.failed += batch.length
       }

      // 배치 간 딜레이
      if (i + BATCH_SIZE < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    return results
  }

  // 개별 토큰 가격 업데이트
  private async updateTokenPrice(tokenAddress: string, currentPrice: number): Promise<void> {
    if (!currentPrice || currentPrice <= 0) {
      return
    }

    try {
      // 현재 15분 구간 계산
      const now = new Date()
      const timestamp15min = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        Math.floor(now.getMinutes() / 15) * 15
      ).toISOString()

      // 기존 OHLC 데이터 조회
      const { data: existingData, error: fetchError } = await supabaseAdmin
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .eq('timestamp_15min', timestamp15min)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existingData) {
        // 기존 데이터 업데이트 (OHLC)
        const { error: updateError } = await supabaseAdmin
          .from('token_price_history')
          .update({
            price: currentPrice,
            high_price: Math.max(existingData.high_price, currentPrice),
            low_price: Math.min(existingData.low_price, currentPrice),
            close_price: currentPrice
          })
          .eq('id', existingData.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // 새 데이터 삽입
        const { error: insertError } = await supabaseAdmin
          .from('token_price_history')
                     .insert({
             token_address: tokenAddress,
             price: currentPrice,
             open_price: currentPrice,
             high_price: currentPrice,
             low_price: currentPrice,
             close_price: currentPrice,
             timestamp_15min: timestamp15min,
             volume: 0
           })

        if (insertError) {
          throw insertError
        }
      }
    } catch (error) {
      throw error
    }
  }
}

// 싱글톤 인스턴스
export const tokenPriceServiceOptimized = new TokenPriceServiceOptimized()
export default tokenPriceServiceOptimized 