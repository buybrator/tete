'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { 
  GridComponent, 
  TooltipComponent,
  DataZoomComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { tokenPriceManager, type ChartDataPoint, type PriceData } from '@/lib/tokenPriceManager';

// ECharts 컴포넌트 등록
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer
]);

interface TokenChartOptimizedProps {
  tokenAddress?: string;
  className?: string;
}

export default function TokenChartOptimized({ tokenAddress, className = '' }: TokenChartOptimizedProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.EChartsType | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // SOL 토큰 주소 (기본값)
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const targetToken = tokenAddress || SOL_MINT;

  // 차트 옵션 생성
  const createChartOption = useCallback((data: ChartDataPoint[]) => {
    return {
      animation: false, // 성능 최적화
      grid: {
        top: 10,
        right: 10,
        bottom: 20,
        left: 10,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.time),
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
        splitLine: { show: false }
      },
      series: [{
        type: 'line',
        data: data.map(d => d.open),
        smooth: true,
        symbol: 'none',
        sampling: 'lttb', // 대용량 데이터 샘플링
        lineStyle: {
          color: 'rgb(255, 184, 0)',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 184, 0, 0.3)' },
            { offset: 1, color: 'rgba(255, 184, 0, 0)' }
          ])
        },
        // 대용량 데이터 최적화
        large: true,
        largeThreshold: 200,
        progressive: 100,
        progressiveThreshold: 1000
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#666',
        borderRadius: 8,
        padding: 12,
        textStyle: { color: '#fff' },
        formatter: (params: any[]) => {
          if (!params || !params[0]) return '';
          const data = params[0];
          const index = data.dataIndex;
          const point = chartData[index];
          if (!point) return '';
          
          return `
            <div style="font-size: 12px;">
              <div style="color: #999; margin-bottom: 4px;">${point.fullTime}</div>
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
                Open: $${point.open.toFixed(6)}
              </div>
              <div style="color: #4ade80;">High: $${point.high.toFixed(6)}</div>
              <div style="color: #f87171;">Low: $${point.low.toFixed(6)}</div>
              <div style="color: #60a5fa;">Close: $${point.price.toFixed(6)}</div>
            </div>
          `;
        }
      }
    };
  }, []);

  // 차트 데이터 상태
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // 가격 업데이트 핸들러
  const handlePriceUpdate = useCallback((data: PriceData) => {
    setCurrentPrice(data.price);
    setPriceChange(data.priceChange);
  }, []);

  // 차트 업데이트 핸들러
  const handleChartUpdate = useCallback((data: ChartDataPoint[]) => {
    setChartData(data);
    setIsLoading(false);

    // ECharts 업데이트 (appendData 대신 setOption 사용)
    if (chartInstance.current && data.length > 0) {
      chartInstance.current.setOption(createChartOption(data));
    }
  }, [createChartOption]);

  // ECharts 초기화
  useEffect(() => {
    if (!chartRef.current) return;

    // 차트 인스턴스 생성
    chartInstance.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: true // 더티 렉트 최적화
    });

    // 리사이즈 핸들러
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  // 토큰 구독
  useEffect(() => {
    if (!tokenAddress || targetToken === SOL_MINT) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // 가격 구독
    const unsubscribePrice = tokenPriceManager.subscribeToPrice(
      targetToken,
      handlePriceUpdate
    );

    // 차트 구독
    const unsubscribeChart = tokenPriceManager.subscribeToChart(
      targetToken,
      handleChartUpdate
    );

    return () => {
      unsubscribePrice();
      unsubscribeChart();
    };
  }, [targetToken, tokenAddress, handlePriceUpdate, handleChartUpdate]);

  const isPositive = priceChange >= 0;
  const hasData = chartData.length > 0 && tokenAddress && targetToken !== SOL_MINT;

  return (
    <div className={`rounded-lg px-3 pt-3 ${className}`} style={{ backgroundColor: 'oklch(0.2393 0 0)' }}>
      {/* 가격 정보 - 실시간 업데이트 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {hasData ? `$${currentPrice.toFixed(6)}` : '--'}
          </span>
          <span className={`text-sm font-medium ${
            hasData ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-gray-400'
          }`}>
            {hasData ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : '--'}
          </span>
        </div>
      </div>

      {/* ECharts 차트 */}
      {hasData && !isLoading ? (
        <div className="h-32 w-full">
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : null}
    </div>
  );
}