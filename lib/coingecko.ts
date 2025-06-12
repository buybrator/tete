'use client';

export type ChartDataPoint = {
  timestamp: number;
  price: number;
};

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'All';

/**
 * 토큰의 가격 차트 데이터를 가져옵니다 (API 라우트 사용)
 */
export async function fetchTokenChart(
  tokenAddress: string,
  period: TimePeriod = '1D'
): Promise<ChartDataPoint[]> {
  try {
    console.log(`🔄 차트 API 호출: ${tokenAddress}, 기간: ${period}`);
    
    const response = await fetch(
      `/api/chart?token=${encodeURIComponent(tokenAddress)}&period=${period}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }

    console.log(`✅ 차트 데이터 수신: ${result.data.length}개 포인트`);
    return result.data;
  } catch (error) {
    console.error('❌ 차트 데이터 로딩 실패:', error);
    throw error;
  }
}

/**
 * 토큰의 현재 가격을 가져옵니다 (미구현 - 필요시 추가)
 */
export async function fetchTokenPrice(tokenAddress: string): Promise<number> {
  // 현재 가격은 차트 데이터의 마지막 포인트에서 가져올 수 있음
  try {
    const chartData = await fetchTokenChart(tokenAddress, '1D');
    if (chartData.length > 0) {
      return chartData[chartData.length - 1].price;
    }
    throw new Error('No price data available');
  } catch (error) {
    console.error('Failed to fetch token price:', error);
    throw error;
  }
}

/**
 * 폴백용 더미 차트 데이터 생성
 */
export function generateFallbackChartData(
  period: TimePeriod = '1D',
  basePrice: number = 45
): ChartDataPoint[] {
  const dataPoints = period === '1H' ? 24 : period === '1D' ? 24 : 50;
  const data: ChartDataPoint[] = [];
  let price = basePrice;
  const now = Date.now();
  const interval = period === '1H' ? 60 * 1000 : 
                  period === '1D' ? 60 * 60 * 1000 : 
                  24 * 60 * 60 * 1000;
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    // 랜덤한 가격 변동 (-2% ~ +2%)
    const change = (Math.random() - 0.5) * 0.04;
    price = price * (1 + change);
    
    data.push({
      timestamp: now - (i * interval),
      price: price
    });
  }
  
  return data;
}

/**
 * 간단한 가격 기반 차트 데이터 생성 (Jupiter API 사용)
 */
export async function fetchSimpleTokenPrice(tokenAddress: string): Promise<number | null> {
  try {
    // Jupiter Price API v2 사용
    const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}`);
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.data && data.data[tokenAddress]) {
      const price = data.data[tokenAddress].price;
      console.log(`💰 Jupiter에서 가격 조회: $${price}`);
      return price;
    }
    
    throw new Error('Price data not found');
  } catch (error) {
    console.error('❌ Jupiter 가격 조회 실패:', error);
    return null;
  }
}

/**
 * 현재 가격 기반으로 시뮬레이션된 차트 데이터 생성
 */
export function generateSimulatedChartData(
  currentPrice: number,
  period: TimePeriod = '1D'
): ChartDataPoint[] {
  const now = Date.now();
  let dataPoints = 24;
  let interval = 60 * 60 * 1000; // 1시간
  let volatility = 0.015; // 1.5% 변동성
  
  switch (period) {
    case '1H':
      dataPoints = 12;
      interval = 5 * 60 * 1000; // 5분
      volatility = 0.005; // 0.5%
      break;
    case '1D':
      dataPoints = 24;
      interval = 60 * 60 * 1000; // 1시간
      volatility = 0.015; // 1.5%
      break;
    case '1W':
      dataPoints = 28;
      interval = 6 * 60 * 60 * 1000; // 6시간
      volatility = 0.03; // 3%
      break;
    case '1M':
      dataPoints = 30;
      interval = 24 * 60 * 60 * 1000; // 1일
      volatility = 0.05; // 5%
      break;
    case 'All':
      dataPoints = 50;
      interval = 7 * 24 * 60 * 60 * 1000; // 1주일
      volatility = 0.08; // 8%
      break;
  }

  const data: ChartDataPoint[] = [];
  let price = currentPrice;
  
  // 과거 시점부터 현재까지 시뮬레이션
  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = now - (i * interval);
    
    if (i === 0) {
      // 마지막 포인트는 현재 가격
      price = currentPrice;
    } else {
      // 랜덤 워크로 과거 가격 시뮬레이션
      const randomChange = (Math.random() - 0.5) * volatility * 2;
      const trend = i / dataPoints * 0.02; // 약간의 상승 추세
      price = price * (1 - randomChange - trend);
      
      // 가격이 현재가의 50%~150% 범위를 벗어나지 않도록 제한
      price = Math.max(price, currentPrice * 0.5);
      price = Math.min(price, currentPrice * 1.5);
    }
    
    data.push({
      timestamp,
      price: Math.max(price, 0.0001) // 최소값 보장
    });
  }
  
  return data.reverse(); // 시간 순서대로 정렬
}

/**
 * 개선된 토큰 차트 데이터 가져오기 (폴백 포함)
 */
export async function fetchTokenChartWithFallback(
  tokenAddress: string,
  period: TimePeriod = '1D'
): Promise<ChartDataPoint[]> {
  try {
    console.log(`🔄 차트 데이터 로딩: ${tokenAddress} (${period})`);
    
    // 1차: GeckoTerminal API 시도
    try {
      const response = await fetchTokenChart(tokenAddress, period);
      if (response && response.length > 0) {
        console.log(`✅ GeckoTerminal 성공: ${response.length}개 포인트`);
        return response;
      }
    } catch (error) {
      console.log(`⚠️ GeckoTerminal 실패, Jupiter 시도: ${error}`);
    }
    
    // 2차: Jupiter 가격 기반 시뮬레이션
    const currentPrice = await fetchSimpleTokenPrice(tokenAddress);
    if (currentPrice) {
      console.log(`✅ Jupiter 가격으로 차트 생성: $${currentPrice}`);
      return generateSimulatedChartData(currentPrice, period);
    }
    
    // 3차: 완전 폴백 (기본 가격으로 시뮬레이션)
    console.log(`⚠️ 모든 API 실패, 기본 차트 생성`);
    const fallbackPrice = tokenAddress === 'So11111111111111111111111111111111111111112' ? 200 : 1;
    return generateSimulatedChartData(fallbackPrice, period);
    
  } catch (error) {
    console.error('❌ 차트 로딩 완전 실패:', error);
    throw error;
  }
}

export default {
  fetchTokenChart,
  fetchTokenPrice,
  generateFallbackChartData,
  fetchSimpleTokenPrice,
  generateSimulatedChartData,
  fetchTokenChartWithFallback,
}; 