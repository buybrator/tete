import { NextRequest, NextResponse } from 'next/server';
import { TokenPriceService } from '@/lib/tokenPriceService';

// 🔄 실시간 가격 및 변화율 조회 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '토큰 주소가 필요합니다'
      }, { status: 400 });
    }


    const priceService = new TokenPriceService();
    
    // Jupiter API에서 현재 가격 가져오기
    const currentPrice = await priceService.getLatestTokenPrice(token);
    
    if (!currentPrice) {
      return NextResponse.json({
        success: false,
        error: '현재 가격을 가져올 수 없습니다'
      }, { status: 404 });
    }

    // DB에서 과거 데이터 가져와서 변화율 계산
    const priceHistory = await priceService.getTokenPriceHistory(token);
    
    let priceChange = 0;
    if (priceHistory.length > 0) {
      const firstPrice = priceHistory[0].open_price;
      priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;
    }

    const result = {
      tokenAddress: token,
      currentPrice,
      priceChange,
      lastUpdated: new Date().toISOString()
    };


    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '실시간 가격 조회 중 서버 오류가 발생했습니다',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 