'use client';

import { useState, useEffect, useRef } from 'react';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface TokenChartProps {
  tokenAddress?: string;
  className?: string;
}

// 차트 데이터 타입 정의 (DB 기반)
interface ChartDataPoint {
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  time: string;
  fullTime: string;
}

// API 응답 타입
interface PriceApiResponse {
  success: boolean;
  data: {
    tokenAddress: string;
    currentPrice: number;
    priceChange: number;
    historyCount: number;
    chartData: ChartDataPoint[];
    lastUpdated: string | null;
  };
  error?: string;
}

// 실시간 가격 API 응답 타입
interface RealtimePriceResponse {
  success: boolean;
  data: {
    tokenAddress: string;
    currentPrice: number;
    priceChange: number;
    lastUpdated: string;
  };
  error?: string;
}

export default function TokenChart({ tokenAddress, className = '' }: TokenChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(0);
  
  // 인터벌 참조
  const chartUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const quarterHourIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // SOL 토큰 주소 (기본값)
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const targetToken = tokenAddress || SOL_MINT;

  // DB에서 가격 데이터 가져오기 (실제 데이터만) - 차트용
  const fetchPriceData = async () => {
    try {
      const response = await fetch(`/api/price-updater?token=${encodeURIComponent(targetToken)}`);
      
      if (!response.ok) {
        console.warn('가격 API 응답 실패:', response.status);
        handleApiFailure();
        return;
      }

      const result: PriceApiResponse = await response.json();
      
      if (!result.success || !result.data) {
        console.warn('가격 API 데이터 없음:', result.error);
        handleApiFailure();
        return;
      }

      const { currentPrice, priceChange, chartData, historyCount, lastUpdated } = result.data;
      
      // 실제 DB에서 수집된 데이터가 있는지 확인
      if (historyCount === 0 || !chartData || chartData.length === 0) {
        console.log('📊 실제 수집된 DB 데이터 없음');
        handleApiFailure();
        return;
      }
      
      console.log('📊 실제 DB 데이터 로드:', {
        현재가격: currentPrice,
        변화율: priceChange.toFixed(2) + '%',
        데이터포인트: chartData.length,
        히스토리개수: historyCount,
        마지막업데이트: lastUpdated
      });

      setCurrentPrice(currentPrice || 0);
      setPriceChange(priceChange || 0);
      setChartData(chartData || []);
      setHistoryCount(historyCount || 0);
      setLastUpdated(lastUpdated);

    } catch (error) {
      console.error('가격 데이터 가져오기 오류:', error);
      // API 실패 시 빈 상태로 처리
      handleApiFailure();
    }
  };

  // 실시간 가격과 변화율만 업데이트 (1분마다)
  const fetchRealtimePrice = async () => {
    try {
      const response = await fetch(`/api/price-realtime?token=${encodeURIComponent(targetToken)}`);
      
      if (!response.ok) {
        console.warn('실시간 가격 API 실패:', response.status);
        return;
      }

      const result: RealtimePriceResponse = await response.json();
      
      if (!result.success || !result.data) {
        console.warn('실시간 가격 데이터 없음:', result.error);
        return;
      }

      const { currentPrice: newPrice, priceChange: newChange } = result.data;
      
      console.log('🔄 실시간 가격 업데이트:', {
        이전가격: currentPrice,
        현재가격: newPrice,
        변화율: newChange.toFixed(2) + '%'
      });

      // 가격과 변화율만 업데이트 (차트 데이터는 유지)
      setCurrentPrice(newPrice);
      setPriceChange(newChange);

    } catch (error) {
      console.error('실시간 가격 업데이트 오류:', error);
    }
  };

  // 백그라운드에서 가격 업데이트 트리거
  const triggerPriceUpdate = async () => {
    try {
      console.log('🔄 가격 업데이트 트리거');
      
      const response = await fetch('/api/price-updater', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: [targetToken]
        })
      });

      if (response.ok) {
        console.log('✅ 가격 업데이트 트리거 성공');
        // 업데이트 후 새 데이터 가져오기
        setTimeout(() => fetchPriceData(), 2000);
      }
    } catch (error) {
      console.error('가격 업데이트 트리거 실패:', error);
    }
  };

  // API 실패 시 빈 상태로 처리 (시뮬레이션 데이터 제거)
  const handleApiFailure = () => {
    console.log('⚠️ API 실패 - 실제 데이터만 표시');
    
    // 시뮬레이션 데이터 대신 빈 상태로 설정
    setChartData([]);
    setCurrentPrice(0);
    setPriceChange(0);
    setHistoryCount(0);
    setLastUpdated(null);
  };

  // 컴포넌트 마운트 시 데이터 로드 (실제 데이터만)
  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 토큰 차트 초기화 (실제 데이터만):', targetToken);
      
      setIsLoading(true);
      
      // 먼저 빈 상태로 초기화
      handleApiFailure();
      
      // 🔧 백그라운드 수집기 상태 확인 및 시작
      await checkAndStartBackgroundCollector();
      
      // 실제 DB 데이터 로드 시도
      await fetchPriceData();
      
      // 데이터가 없으면 백그라운드에서 수집 시작
      if (historyCount === 0) {
        console.log('🔄 데이터 없음 - 백그라운드 수집 시작');
        await triggerPriceUpdate();
      }
      
      setIsLoading(false);
    };

    initializeData();
    
    // 🎯 개선된 15분 정각 업데이트 시스템
    const setupIntervals = () => {
      // 1. 차트 데이터 정기 업데이트 (3분마다 - 더 자주 체크)
      chartUpdateIntervalRef.current = setInterval(() => {
        fetchPriceData();
      }, 3 * 60 * 1000);
      
      // 2. 15분 정각 백그라운드 업데이트 시스템
      const setup15MinUpdates = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();
        
        // 다음 15분 정각까지 남은 시간 계산 (0, 15, 30, 45분)
        const nextQuarterHour = Math.ceil(minutes / 15) * 15;
        const minutesToNext = (nextQuarterHour === 60) ? (60 - minutes) : (nextQuarterHour - minutes);
        const millisecondsToNext = (minutesToNext * 60 - seconds) * 1000 - milliseconds;
        
        console.log(`⏰ 다음 15분 정각까지 ${Math.round(millisecondsToNext / 1000)}초 대기`);
        
        // 첫 번째 15분 정각까지 대기
        setTimeout(() => {
          // 15분 정각에 백그라운드 업데이트 실행
          console.log('🔔 15분 정각 - 백그라운드 업데이트 트리거');
          triggerPriceUpdate();
          
          // 이후 정확히 15분마다 반복 실행
          const quarterHourInterval = setInterval(() => {
            console.log('🔔 15분 간격 - 백그라운드 업데이트 트리거');
            triggerPriceUpdate();
          }, 15 * 60 * 1000);
          
          // cleanup 함수에서 정리할 수 있도록 저장
          quarterHourIntervalRef.current = quarterHourInterval;
          
        }, millisecondsToNext);
      };
      
      setup15MinUpdates();
      
      // 3. 실시간 가격 업데이트 (1분마다)
      priceUpdateIntervalRef.current = setInterval(() => {
        fetchRealtimePrice();
      }, 60 * 1000);
    };
    
    setupIntervals();
    
    return () => {
      if (chartUpdateIntervalRef.current) {
        // 15분 간격 인터벌도 정리
        const quarterHourInterval = quarterHourIntervalRef.current;
        if (quarterHourInterval) {
          clearInterval(quarterHourInterval);
        }
        clearInterval(chartUpdateIntervalRef.current);
      }
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
      }
    };
  }, [targetToken]);

  // 차트 Y축 도메인 계산 (데이터가 적을 때 전체 Y축 확장)
  const getYAxisDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    const prices = chartData.map(d => d.open);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // 데이터가 2개 이하일 때는 Y축을 최대한 확장
    if (chartData.length <= 2) {
      const priceRange = maxPrice - minPrice;
      const expandedPadding = priceRange > 0 ? priceRange * 0.5 : maxPrice * 0.1;
      
      return [
        Math.max(0, minPrice - expandedPadding).toFixed(8),
        (maxPrice + expandedPadding).toFixed(8)
      ];
    }
    
    // 일반적인 경우 1% 패딩
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.01;
    
    return [
      (minPrice - padding).toFixed(6),
      (maxPrice + padding).toFixed(6)
    ];
  };

  const isPositive = priceChange >= 0;

  // 🚀 백그라운드 수집기 상태 확인 및 시작
  const checkAndStartBackgroundCollector = async () => {
    try {
      console.log('🔍 백그라운드 수집기 상태 확인 중...');
      
      // 상태 확인
      const statusResponse = await fetch('/api/background/price-collector?action=status');
      const statusData = await statusResponse.json();
      
      console.log('📊 백그라운드 수집기 상태:', statusData);
      
      if (!statusData.isRunning) {
        console.log('🚀 백그라운드 수집기 시작 중...');
        
        // 수집기 시작
        const startResponse = await fetch('/api/background/price-collector?action=start');
        const startData = await startResponse.json();
        
        if (startData.success) {
          console.log('✅ 백그라운드 수집기 시작 성공');
          toast.success('15분 자동 업데이트가 활성화되었습니다', { id: 'background-collector' });
        } else {
          console.error('❌ 백그라운드 수집기 시작 실패:', startData);
          toast.error('자동 업데이트 시작에 실패했습니다', { id: 'background-collector' });
        }
      } else {
        console.log('✅ 백그라운드 수집기가 이미 실행 중입니다');
        const nextCollection = statusData.stats?.nextCollection;
        if (nextCollection) {
          const nextTime = new Date(nextCollection).toLocaleTimeString();
          console.log(`⏰ 다음 자동 수집: ${nextTime}`);
        }
      }
    } catch (error) {
      console.error('❌ 백그라운드 수집기 확인 실패:', error);
      // 에러가 발생해도 차트는 정상 작동하도록 함
    }
  };

  return (
    <div className={`bg-white rounded-lg px-3 pt-3 pb-[90px] ${className}`}>
      {/* 가격 정보 - 실시간 업데이트 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            {historyCount > 0 ? `$${currentPrice.toFixed(6)}` : '--'}
          </span>
          <span className={`text-sm font-medium ${
            historyCount > 0 ? (isPositive ? 'text-green-600' : 'text-red-600') : 'text-gray-400'
          }`}>
            {historyCount > 0 ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : '--'}
          </span>
        </div>
      </div>

      {/* Recharts 차트 (실제 DB 데이터만) */}
      {chartData.length > 0 && !isLoading && historyCount > 0 && lastUpdated ? (
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
            >
              <XAxis 
                dataKey="time"
                hide={false}
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#666' }}
                interval={chartData.length <= 2 ? 0 : "preserveStartEnd"}
              />
              <YAxis 
                domain={getYAxisDomain()} 
                hide={true}
              />
              <Line 
                type="monotone" 
                dataKey="open" 
                stroke="#2563eb" 
                strokeWidth={chartData.length <= 2 ? 3 : 2}
                dot={chartData.length <= 2 ? { r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' } : false}
                activeDot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                connectNulls={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    const openPrice = data.open;
                    
                    return (
                      <div className="bg-black/90 text-white border border-gray-600 rounded-lg shadow-xl p-3 text-xs backdrop-blur-sm">
                        <p className="font-medium text-gray-200 mb-1">시간: {data.fullTime}</p>
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">
                            Open: ${openPrice.toFixed(6)}
                          </p>
                          <p className="text-green-400 text-xs">
                            High: ${data.high.toFixed(6)}
                          </p>
                          <p className="text-red-400 text-xs">
                            Low: ${data.low.toFixed(6)}
                          </p>
                          <p className="text-blue-400 text-xs">
                            Close: ${data.price.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '2,2' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}


    </div>
  );
} 