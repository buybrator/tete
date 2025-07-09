import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { clientCache } from '@/lib/clientCache';

// 가격 데이터 타입
export interface PriceData {
  tokenAddress: string;
  price: number;
  priceChange: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// 차트 포인트 타입
export interface ChartDataPoint {
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  time: string;
  fullTime: string;
}

// 구독자 콜백 타입
type PriceUpdateCallback = (data: PriceData) => void;
type ChartUpdateCallback = (data: ChartDataPoint[]) => void;

// 토큰별 구독자 관리
class TokenPriceManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<PriceUpdateCallback>> = new Map();
  private chartSubscribers: Map<string, Set<ChartUpdateCallback>> = new Map();
  private priceCache: Map<string, PriceData> = new Map();
  private chartCache: Map<string, ChartDataPoint[]> = new Map();

  // 토큰 가격 구독
  subscribeToPrice(tokenAddress: string, callback: PriceUpdateCallback) {
    if (!this.subscribers.has(tokenAddress)) {
      this.subscribers.set(tokenAddress, new Set());
      this.setupChannel(tokenAddress);
    }
    
    this.subscribers.get(tokenAddress)!.add(callback);
    
    // 캐시된 데이터가 있으면 즉시 전달
    const cached = this.priceCache.get(tokenAddress);
    if (cached) {
      callback(cached);
    }
    
    // 구독 해제 함수 반환
    return () => {
      const subs = this.subscribers.get(tokenAddress);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.cleanupChannel(tokenAddress);
        }
      }
    };
  }

  // 차트 데이터 구독
  subscribeToChart(tokenAddress: string, callback: ChartUpdateCallback) {
    if (!this.chartSubscribers.has(tokenAddress)) {
      this.chartSubscribers.set(tokenAddress, new Set());
    }
    
    this.chartSubscribers.get(tokenAddress)!.add(callback);
    
    // 캐시된 차트 데이터가 있으면 즉시 전달
    const cached = this.chartCache.get(tokenAddress);
    if (cached) {
      callback(cached);
    }
    
    // 초기 데이터 로드
    this.loadChartData(tokenAddress);
    
    return () => {
      const subs = this.chartSubscribers.get(tokenAddress);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  // Supabase 채널 설정
  private setupChannel(tokenAddress: string) {
    const channel = supabase
      .channel(`price:${tokenAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_price_history',
          filter: `token_address=eq.${tokenAddress}`
        },
        (payload) => {
          this.handlePriceUpdate(tokenAddress, payload.new);
        }
      )
      .on(
        'broadcast',
        { event: 'price_update' },
        (payload) => {
          // 브로드캐스트된 실시간 가격 업데이트
          this.handleRealtimePrice(tokenAddress, payload.payload);
        }
      )
      .subscribe();
    
    this.channels.set(tokenAddress, channel);
  }

  // 채널 정리
  private cleanupChannel(tokenAddress: string) {
    const channel = this.channels.get(tokenAddress);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(tokenAddress);
    }
    this.subscribers.delete(tokenAddress);
    this.priceCache.delete(tokenAddress);
  }

  // DB에서 가격 업데이트 처리
  private handlePriceUpdate(tokenAddress: string, data: any) {
    const priceData: PriceData = {
      tokenAddress,
      price: data.close || data.open,
      priceChange: this.calculatePriceChange(tokenAddress, data.close || data.open),
      timestamp: data.timestamp_15min,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close || data.open
    };
    
    this.priceCache.set(tokenAddress, priceData);
    this.notifySubscribers(tokenAddress, priceData);
    
    // 차트 데이터도 업데이트
    this.appendChartData(tokenAddress, data);
  }

  // 실시간 가격 업데이트 처리
  private handleRealtimePrice(tokenAddress: string, data: any) {
    const cached = this.priceCache.get(tokenAddress);
    if (cached) {
      cached.price = data.price;
      cached.priceChange = data.priceChange;
      this.notifySubscribers(tokenAddress, cached);
    }
  }

  // 가격 변화율 계산
  private calculatePriceChange(tokenAddress: string, currentPrice: number): number {
    const cached = this.priceCache.get(tokenAddress);
    if (!cached) return 0;
    
    const previousPrice = cached.price;
    if (previousPrice === 0) return 0;
    
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  // 구독자에게 알림
  private notifySubscribers(tokenAddress: string, data: PriceData) {
    const subs = this.subscribers.get(tokenAddress);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  // 차트 데이터 로드
  private async loadChartData(tokenAddress: string) {
    try {
      // 1. 클라이언트 캐시 확인
      await clientCache.init();
      const cached = await clientCache.get(tokenAddress);
      
      if (cached && cached.chartData.length > 0) {
        this.chartCache.set(tokenAddress, cached.chartData);
        this.notifyChartSubscribers(tokenAddress, cached.chartData);
        
        // 백그라운드에서 최신 데이터 확인
        this.refreshChartData(tokenAddress);
        return;
      }
      
      // 2. DB에서 데이터 로드
      const { data, error } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .order('timestamp_15min', { ascending: true })
        .limit(48);
      
      if (error) throw error;
      
      const chartData = this.formatChartData(data || []);
      this.chartCache.set(tokenAddress, chartData);
      this.notifyChartSubscribers(tokenAddress, chartData);
      
      // 3. 클라이언트 캐시에 저장
      if (chartData.length > 0) {
        await clientCache.set(tokenAddress, chartData);
      }
    } catch (error) {
      console.error('차트 데이터 로드 실패:', error);
    }
  }

  // 차트 데이터 새로고침 (백그라운드)
  private async refreshChartData(tokenAddress: string) {
    try {
      const { data, error } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', tokenAddress)
        .order('timestamp_15min', { ascending: true })
        .limit(48);
      
      if (error) throw error;
      
      const chartData = this.formatChartData(data || []);
      const cachedData = this.chartCache.get(tokenAddress) || [];
      
      // 데이터가 변경된 경우만 업데이트
      if (JSON.stringify(chartData) !== JSON.stringify(cachedData)) {
        this.chartCache.set(tokenAddress, chartData);
        this.notifyChartSubscribers(tokenAddress, chartData);
        await clientCache.set(tokenAddress, chartData);
      }
    } catch (error) {
      console.error('차트 데이터 새로고침 실패:', error);
    }
  }

  // 차트 데이터 추가
  private appendChartData(tokenAddress: string, newData: any) {
    const existing = this.chartCache.get(tokenAddress) || [];
    const newPoint = this.formatSinglePoint(newData);
    
    // 중복 제거 및 최대 48개 유지
    const updated = [...existing, newPoint]
      .filter((item, index, self) => 
        index === self.findIndex(t => t.timestamp === item.timestamp)
      )
      .slice(-48);
    
    this.chartCache.set(tokenAddress, updated);
    this.notifyChartSubscribers(tokenAddress, updated);
  }

  // 차트 구독자에게 알림
  private notifyChartSubscribers(tokenAddress: string, data: ChartDataPoint[]) {
    const subs = this.chartSubscribers.get(tokenAddress);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  // 차트 데이터 포맷팅
  private formatChartData(data: any[]): ChartDataPoint[] {
    return data.map(item => this.formatSinglePoint(item));
  }

  // 단일 포인트 포맷팅
  private formatSinglePoint(item: any): ChartDataPoint {
    const date = new Date(item.timestamp_15min);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    const fullTime = date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return {
      timestamp: date.getTime(),
      price: item.close || item.open,
      open: item.open,
      high: item.high,
      low: item.low,
      time,
      fullTime
    };
  }

  // 실시간 가격 브로드캐스트 (서버에서 호출)
  async broadcastPrice(tokenAddress: string, price: number, priceChange: number) {
    const channel = this.channels.get(tokenAddress);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'price_update',
        payload: { price, priceChange }
      });
    }
  }
}

// 싱글톤 인스턴스
export const tokenPriceManager = new TokenPriceManager();