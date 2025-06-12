import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenAddress = searchParams.get('token');

  if (!tokenAddress) {
    return NextResponse.json(
      { error: 'Token address is required' },
      { status: 400 }
    );
  }

  try {
    // believe.app에서 토큰 정보 스크래핑
    const believeUrl = `https://believe.app/explore/${tokenAddress}`;
    
    // 여기서는 시뮬레이션 데이터를 반환
    // 실제로는 firecrawl이나 다른 스크래핑 도구를 사용
    const response = await fetch(believeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // HTML 파싱 대신 시뮬레이션 데이터 반환
    // 실제 구현에서는 cheerio나 다른 HTML 파서를 사용하여 가격 정보 추출
    const priceData = {
      price: 0.0265 + (Math.random() * 0.01 - 0.005),
      change24h: -5.80 + (Math.random() * 10 - 5),
      chartData: generateChartData(),
      volume24h: 1250000 + Math.random() * 500000,
      marketCap: 26500000 + Math.random() * 5000000
    };

    return NextResponse.json(priceData);

  } catch (error) {
    console.error('Scraping error:', error);
    
    // 실패시 기본 데이터 반환
    return NextResponse.json({
      price: 0.0265,
      change24h: -5.80,
      chartData: generateChartData(),
      volume24h: 1250000,
      marketCap: 26500000
    });
  }
}

function generateChartData(): number[] {
  const basePrice = 0.0265;
  const dataPoints = 24; // 24시간 데이터
  
  return Array.from({ length: dataPoints }, (_, i) => {
    const trend = Math.sin((i / dataPoints) * Math.PI * 2) * 0.003;
    const noise = (Math.random() - 0.5) * 0.001;
    return basePrice + trend + noise;
  });
} 