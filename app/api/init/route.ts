import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 백그라운드 가격 수집기 초기화
    const response = await fetch('http://localhost:3001/api/background/price-collector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('🚀 서버 초기화: 백그라운드 가격 수집기 활성화됨');
      
      return NextResponse.json({
        success: true,
        message: '서버가 성공적으로 초기화되었습니다.',
        backgroundCollector: result
      });
    } else {
      throw new Error(`백그라운드 수집기 초기화 실패: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ 서버 초기화 실패:', error);
    
    return NextResponse.json({
      success: false,
      message: '서버 초기화 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 