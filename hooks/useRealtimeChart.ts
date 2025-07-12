import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChartDataPoint {
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useRealtimeChart(tokenAddress: string) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // 초기 데이터 로드
  const loadChartData = async () => {
    try {
      setIsLoading(true);
      
      // DB API 호출 (1분 간격 데이터)
      const response = await fetch(`/api/chart/db?token=${tokenAddress}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data as ChartDataPoint[];
        setChartData(data);
        
        if (data.length > 0) {
          const latest = data[data.length - 1];
          const first = data[0];
          
          setCurrentPrice(latest.price);
          const change = ((latest.price - first.price) / first.price) * 100;
          setPriceChange(change);
        }
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 실시간 구독 설정
  useEffect(() => {
    if (!tokenAddress) return;

    // 초기 데이터 로드
    loadChartData();

    // Supabase 실시간 구독
    const newChannel = supabase
      .channel(`price-updates-${tokenAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_price_history',
          filter: `token_address=eq.${tokenAddress}`
        },
        (payload) => {
          console.log('New price data:', payload);
          
          // 새 데이터 추가
          const newData = payload.new;
          const newPoint: ChartDataPoint = {
            timestamp: new Date(newData.timestamp_1min).getTime(),
            price: newData.close_price,
            open: newData.open_price,
            high: newData.high_price,
            low: newData.low_price,
            close: newData.close_price
          };

          setChartData(prev => {
            // 최대 60개 유지 (1시간)
            const updated = [...prev, newPoint].slice(-60);
            
            // 가격 변화율 계산
            if (updated.length > 0) {
              const latest = updated[updated.length - 1];
              const first = updated[0];
              setCurrentPrice(latest.price);
              const change = ((latest.price - first.price) / first.price) * 100;
              setPriceChange(change);
            }
            
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'token_price_history',
          filter: `token_address=eq.${tokenAddress}`
        },
        (payload) => {
          console.log('Price update:', payload);
          
          // 기존 데이터 업데이트
          const updatedData = payload.new;
          const timestamp = new Date(updatedData.timestamp_1min).getTime();
          
          setChartData(prev => {
            return prev.map(point => {
              if (point.timestamp === timestamp) {
                return {
                  ...point,
                  price: updatedData.close_price,
                  high: Math.max(point.high, updatedData.high_price),
                  low: Math.min(point.low, updatedData.low_price),
                  close: updatedData.close_price
                };
              }
              return point;
            });
          });
          
          setCurrentPrice(updatedData.close_price);
        }
      )
      .subscribe();

    setChannel(newChannel);

    // 정리 함수
    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [tokenAddress]);

  // 1분마다 데이터 새로고침 (백업)
  useEffect(() => {
    const interval = setInterval(() => {
      loadChartData();
    }, 60000); // 1분

    return () => clearInterval(interval);
  }, [tokenAddress]);

  return {
    chartData,
    currentPrice,
    priceChange,
    isLoading
  };
}