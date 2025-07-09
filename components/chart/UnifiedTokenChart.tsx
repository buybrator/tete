'use client'

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import { unifiedPriceManager, type UnifiedPriceData, type UnifiedChartPoint } from '@/lib/unifiedPriceManager';
import { ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';

interface UnifiedTokenChartProps {
  tokenAddress: string;
  height?: number;
  animate?: boolean;
  showPrice?: boolean;
}

export default function UnifiedTokenChart({ 
  tokenAddress, 
  height = 300,
  animate = false,
  showPrice = true
}: UnifiedTokenChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);
  const [priceData, setPriceData] = useState<UnifiedPriceData | null>(null);
  const [chartData, setChartData] = useState<UnifiedChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 통일된 가격 데이터 구독
  useEffect(() => {
    const unsubscribePrice = unifiedPriceManager.subscribeToPrice(
      tokenAddress, 
      (data) => {
        setPriceData(data);
        setIsLoading(false);
        setError(null);
      }
    );

    return () => {
      unsubscribePrice();
    };
  }, [tokenAddress]);

  // 통일된 차트 데이터 구독
  useEffect(() => {
    const unsubscribeChart = unifiedPriceManager.subscribeToChart(
      tokenAddress,
      (data) => {
        setChartData(data);
        setError(null);
      }
    );

    return () => {
      unsubscribeChart();
    };
  }, [tokenAddress]);

  // ECharts 초기화 및 업데이트
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    // 차트 인스턴스 생성 또는 재사용
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
        useDirtyRect: true
      });
    }

    const prices = chartData.map(d => d.close);
    const minPrice = Math.min(...prices) * 0.995;
    const maxPrice = Math.max(...prices) * 1.005;

    // 가격 상승/하락에 따른 색상 결정
    const isPositive = priceData?.priceChangePercent && priceData.priceChangePercent >= 0;
    const mainColor = isPositive ? '#10b981' : '#ef4444';

    const option = {
      animation: animate,
      grid: {
        top: showPrice ? 10 : 30,
        right: 15,
        bottom: 35,
        left: 65,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.time),
        axisLine: { 
          lineStyle: { color: '#e5e7eb' }
        },
        axisLabel: { 
          color: '#6b7280',
          fontSize: 12,
          interval: Math.max(0, Math.floor(chartData.length / 8))
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: minPrice,
        max: maxPrice,
        splitLine: { 
          lineStyle: { color: '#f3f4f6', width: 1 }
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1) {
              return `$${value.toFixed(2)}`;
            } else {
              return `$${value.toFixed(6)}`;
            }
          }
        }
      },
      series: [{
        type: 'line',
        data: prices,
        smooth: 0.2,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: mainColor
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: `${mainColor}20`
            },
            {
              offset: 1,
              color: `${mainColor}05`
            }
          ])
        },
        large: true,
        largeThreshold: 200,
        progressive: 200,
        progressiveThreshold: 200,
        sampling: 'lttb'
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        textStyle: { 
          color: '#1f2937',
          fontSize: 12
        },
        extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
        formatter: (params: any[]) => {
          const dataIndex = params[0].dataIndex;
          const point = chartData[dataIndex];
          const changeFromOpen = ((point.close - point.open) / point.open) * 100;
          const changeColor = changeFromOpen >= 0 ? '#10b981' : '#ef4444';
          
          return `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                ${point.fullTime}
              </div>
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                $${point.close.toFixed(6)}
              </div>
              <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Open:</span>
                  <span style="font-weight: 500;">$${point.open.toFixed(6)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>High:</span>
                  <span style="font-weight: 500;">$${point.high.toFixed(6)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Low:</span>
                  <span style="font-weight: 500;">$${point.low.toFixed(6)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid #f3f4f6;">
                  <span>Change:</span>
                  <span style="font-weight: 500; color: ${changeColor};">
                    ${changeFromOpen >= 0 ? '+' : ''}${changeFromOpen.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          `;
        }
      }
    };

    chartInstance.current.setOption(option);

    // 리사이즈 핸들러
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartData, priceData, animate, showPrice]);

  // 컴포넌트 언마운트 시 차트 정리
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: `${height + (showPrice ? 80 : 0)}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-500 text-sm">가격 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: `${height + (showPrice ? 80 : 0)}px` }}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-gray-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const hasChartData = chartData.length > 0;
  const priceChangePercent = priceData?.priceChangePercent || 0;
  const isPositive = priceChangePercent >= 0;

  return (
    <div className="w-full">
      {/* 가격 정보 (옵션) */}
      {showPrice && priceData && (
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{priceData.symbol}</h3>
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                {priceData.source === 'jupiter' ? 'Live' : 'DB'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">
                ${priceData.price.toFixed(6)}
              </span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">24h Change</div>
            <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}${priceData.priceChange24h.toFixed(6)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {priceData.hasHistory ? 'Historical data available' : 'New token'}
            </div>
          </div>
        </div>
      )}

      {/* 차트 */}
      {hasChartData ? (
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          <div ref={chartRef} style={{ height: `${height}px` }} className="w-full" />
        </div>
      ) : (
        <div 
          className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <div className="text-gray-400 mb-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-gray-600 text-sm font-medium mb-1">
              {priceData?.hasHistory === false ? '차트 데이터 수집 중' : '차트 데이터 없음'}
            </div>
            <div className="text-gray-400 text-xs">
              {priceData?.hasHistory === false 
                ? '15분 후에 차트가 표시됩니다'
                : '가격 데이터 수집이 필요합니다'
              }
            </div>
          </div>
        </div>
      )}

      {/* 데이터 상태 정보 */}
      {priceData && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          마지막 업데이트: {new Date(priceData.timestamp).toLocaleString('ko-KR')}
          {hasChartData && ` • 차트 포인트: ${chartData.length}개`}
        </div>
      )}
    </div>
  );
}