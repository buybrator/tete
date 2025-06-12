import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 초기화 상태 추적
let isInitialized = false;

export async function middleware(request: NextRequest) {
  // 서버 시작 후 첫 번째 요청에서만 초기화 실행
  if (!isInitialized && !request.nextUrl.pathname.startsWith('/api/init')) {
    try {
      // 백그라운드에서 초기화 실행 (비동기, 응답 대기 안 함)
      fetch('http://localhost:3001/api/init', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(error => {
        console.error('백그라운드 초기화 실패:', error);
      });
      
      isInitialized = true;
      console.log('🔧 미들웨어: 백그라운드 초기화 시작됨');
    } catch (error) {
      console.error('미들웨어 초기화 오류:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 아래 경로들을 제외한 모든 요청에 대해 미들웨어 실행:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 