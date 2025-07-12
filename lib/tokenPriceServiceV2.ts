import { supabase } from './supabase';

// 1분 간격 데이터를 위한 새로운 서비스 (임시)
export class TokenPriceServiceV2 {
  
  // 1분 단위로 시간 정규화
  private normalize1MinTimestamp(date: Date): string {
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);
    return normalized.toISOString();
  }

  // Jupiter API에서 가격 조회
  private async fetchJupiterPrice(tokenAddress: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://price.jup.ag/v6/price?ids=${tokenAddress}&showExtraInfo=true`
      );
      
      if (!response.ok) return null;

      const data = await response.json();
      const tokenData = data.data[tokenAddress];
      
      return tokenData?.price ? parseFloat(tokenData.price) : null;
    } catch {
      return null;
    }
  }

  // 새로운 테이블에 1분 간격 데이터 저장
  async saveOneMinutePrice(tokenAddress: string): Promise<boolean> {
    try {
      const currentPrice = await this.fetchJupiterPrice(tokenAddress);
      if (!currentPrice) return false;

      const timestamp1min = this.normalize1MinTimestamp(new Date());

      // 임시로 timestamp_15min 컬럼에 1분 데이터 저장
      const { error } = await supabase
        .from('token_price_history')
        .insert({
          token_address: tokenAddress,
          price: currentPrice,
          open_price: currentPrice,
          high_price: currentPrice,
          low_price: currentPrice,
          close_price: currentPrice,
          timestamp_15min: timestamp1min, // 1분 간격이지만 기존 컬럼 사용
          volume: 0,
        });

      return !error;
    } catch {
      return false;
    }
  }

  // 기존 데이터를 1분 간격처럼 표시
  async getOneMinuteHistory(tokenAddress: string, limit: number = 60): Promise<any[]> {
    const { data } = await supabase
      .from('token_price_history')
      .select('*')
      .eq('token_address', tokenAddress)
      .order('timestamp_15min', { ascending: false })
      .limit(limit);

    return (data || []).reverse();
  }
}

export const tokenPriceServiceV2 = new TokenPriceServiceV2();