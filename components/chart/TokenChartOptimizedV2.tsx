'use client'

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import { tokenPriceManagerV2, type PriceData, type ChartDataPoint } from '@/lib/tokenPriceManagerV2';
import { ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';

interface TokenChartOptimizedV2Props {
  tokenAddress: string;
  tokenSymbol: string;
  height?: number;
  animate?: boolean;
}

export default function TokenChartOptimizedV2({ 
  tokenAddress, 
  tokenSymbol,
  height = 300,
  animate = false
}: TokenChartOptimizedV2Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 가격 데이터 구독 (즉시 표시)
  useEffect(() => {
    const unsubscribePrice = tokenPriceManagerV2.subscribeToPrice(
      tokenAddress, 
      (data) => {
        setPriceData(data);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribePrice();
    };
  }, [tokenAddress]);

  // 차트 데이터 구독 (히스토리가 있을 때만)
  useEffect(() => {
    const unsubscribeChart = tokenPriceManagerV2.subscribeToChart(
      tokenAddress,
      (data) => {
        setChartData(data);
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

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.99;
    const maxPrice = Math.max(...prices) * 1.01;

    const option = {
      animation: animate,
      grid: {
        top: 10,
        right: 10,
        bottom: 30,
        left: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.time),
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { 
          color: '#666',
          interval: Math.floor(chartData.length / 6),
          rotate: 0
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: minPrice,
        max: maxPrice,
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisLabel: {
          color: '#666',
          formatter: (value: number) => `$${value.toFixed(4)}`
        }
      },
      series: [{
        type: 'line',
        data: prices,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: priceData?.priceChange && priceData.priceChange >= 0 ? '#10b981' : '#ef4444'
        },
        areaStyle: {
          opacity: 0.1,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: priceData?.priceChange && priceData.priceChange >= 0 ? '#10b981' : '#ef4444'
            },
            {
              offset: 1,
              color: 'rgba(255, 255, 255, 0)'
            }
          ])
        },
        large: true,
        largeThreshold: 100,
        progressive: 100,
        progressiveThreshold: 100,
        sampling: 'lttb'
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937' },
        formatter: (params: { dataIndex: number; [key: string]: unknown }[]) => {
          const dataIndex = params[0].dataIndex;
          const point = chartData[dataIndex];
          return `
            <div style="padding: 8px;">
              <div style="font-size: 12px; color: #6b7280;">${point.fullTime}</div>
              <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">
                $${point.price.toFixed(6)}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                Open: $${point.open.toFixed(6)}<br/>
                High: $${point.high.toFixed(6)}<br/>
                Low: $${point.low.toFixed(6)}
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
  }, [chartData, priceData?.priceChange, animate]);

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
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-gray-500">가격 정보를 불러오는 중...</div>
      </div>
    );
  }

  // 가격은 있지만 차트 데이터가 없는 경우 (신규 토큰)
  const hasChartData = chartData.length > 0;
  const priceChangePercent = priceData?.priceChange || 0;
  const isPositive = priceChangePercent >= 0;

  return (
    <div className="w-full">
      {/* 가격 정보는 항상 표시 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{tokenSymbol}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">
              ${priceData?.price.toFixed(6) || '0.000000'}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
              <span className="text-sm font-medium">
                {Math.abs(priceChangePercent).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        {!priceData?.hasHistory && (
          <div className="text-sm text-gray-500">
            신규 토큰 (차트 데이터 수집 중)
          </div>
        )}
      </div>

      {/* 차트는 데이터가 있을 때만 표시 */}
      {hasChartData ? (
        <div ref={chartRef} style={{ height: `${height}px` }} className="w-full" />
      ) : (
        <div 
          className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {priceData?.hasHistory === false 
                ? '차트 데이터를 수집하고 있습니다.\n15분 후에 다시 확인해주세요.'
                : '차트 데이터가 없습니다.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}