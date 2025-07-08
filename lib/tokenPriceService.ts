import { supabase } from './supabase';
import type { Database } from './supabase';

type TokenPriceHistoryRow = Database['public']['Tables']['token_price_history']['Row'];
type TokenPriceHistoryInsert = Database['public']['Tables']['token_price_history']['Insert'];

// 📊 토큰 가격 히스토리 관리 서비스
export class TokenPriceService {
  
  /**
   * 15분 단위로 시간을 정규화합니다 (정각 기준: 00, 15, 30, 45분)
   */
  private normalize15MinTimestamp(date: Date): string {
    const normalized = new Date(date);
    const minutes = normalized.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    normalized.setMinutes(roundedMinutes, 0, 0); // 초, 밀리초도 0으로 설정
    return normalized.toISOString();
  }

  /**
   * Jupiter API에서 실시간 가격을 가져옵니다
   */
  private async fetchJupiterPrice(tokenAddress: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://lite-api.jup.ag/price/v2?ids=${tokenAddress}&showExtraInfo=true`
      );
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const tokenData = data.data[tokenAddress];

      if (tokenData && tokenData.price) {
        return parseFloat(tokenData.price);
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 토큰의 현재 가격을 DB에 저장하거나 업데이트합니다
   */
  async updateTokenPrice(tokenAddress: string): Promise<boolean> {
    try {
      
      // Jupiter API에서 현재 가격 조회
      const currentPrice = await this.fetchJupiterPrice(tokenAddress);
      if (!currentPrice) {
        return false;
      }

      // 현재 시간을 15분 단위로 정규화
      const timestamp15min = this.normalize15MinTimestamp(new Date());

      // 기존 데이터가 있는지 확인
      const { data: existingData } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .eq('timestamp_15min', timestamp15min)
        .single();

      if (existingData) {
        // 기존 데이터가 있으면 OHLC 업데이트
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
          return false;
        }

      } else {
        // 새로운 데이터 삽입
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
          return false;
        }

      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 토큰의 가격 히스토리를 조회합니다 (최대 48개)
   */
  async getTokenPriceHistory(tokenAddress: string): Promise<TokenPriceHistoryRow[]> {
    try {
      const { data, error } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .order('timestamp_15min', { ascending: false })
        .limit(48);

      if (error) {
        return [];
      }

      // 시간순으로 정렬 (오래된 것부터)
      return (data || []).reverse();
    } catch {
      return [];
    }
  }

  /**
   * 토큰의 최신 가격을 조회합니다
   */
  async getLatestTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('token_price_history')
        .select('price')
        .eq('token_address', tokenAddress)
        .order('timestamp_15min', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // DB에 데이터가 없으면 실시간 API 호출
        return await this.fetchJupiterPrice(tokenAddress);
      }

      return data.price;
    } catch {
      return null;
    }
  }

  /**
   * 여러 토큰의 가격을 일괄 업데이트합니다
   */
  async updateMultipleTokenPrices(tokenAddresses: string[]): Promise<void> {
    
    const promises = tokenAddresses.map(address => this.updateTokenPrice(address));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
  }

  /**
   * 오래된 가격 데이터를 정리합니다 (48개 초과 시 자동 삭제)
   */
  async cleanupOldPriceData(tokenAddress: string): Promise<void> {
    try {
      // 최신 48개를 제외한 오래된 데이터 삭제
      const { data: latestRecords } = await supabase
        .from('token_price_history')
        .select('id')
        .eq('token_address', tokenAddress)
        .order('timestamp_15min', { ascending: false })
        .limit(48);

      if (!latestRecords || latestRecords.length <= 48) {
        return; // 정리할 데이터가 없음
      }

      const keepIds = latestRecords.map(record => record.id);
      
      const { error } = await supabase
        .from('token_price_history')
        .delete()
        .eq('token_address', tokenAddress)
        .not('id', 'in', `(${keepIds.map(id => `'${id}'`).join(',')})`);

      if (error) {
      } else {
      }
    } catch {
    }
  }

  /**
   * 차트용 데이터 포맷으로 변환합니다
   */
  formatForChart(priceHistory: TokenPriceHistoryRow[]): Array<{
    timestamp: number;
    price: number;
    open: number;
    high: number;
    low: number;
    time: string;
    fullTime: string;
  }> {
    return priceHistory.map((record, index) => {
      const date = new Date(record.timestamp_15min);
      const timeLabel = date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      return {
        timestamp: date.getTime(),
        price: record.close_price,
        open: record.open_price,
        high: record.high_price,
        low: record.low_price,
        time: index % 8 === 0 ? timeLabel : '', // 2시간마다 표시
        fullTime: timeLabel,
      };
    });
  }
}

// 싱글톤 인스턴스
export const tokenPriceService = new TokenPriceService();

// 기본 토큰 목록
export const DEFAULT_TOKENS = [
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
];

export default tokenPriceService; 