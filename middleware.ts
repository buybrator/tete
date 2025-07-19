import { NextRequest, NextResponse } from 'next/server';
import { RedisRateLimiter } from './lib/rate-limiter-redis';

// 🎯 Rate Limiting 설정
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1분 윈도우
  maxRequests: {
    general: 100,        // 일반 API: 분당 100개
    priceUpdate: 60,     // 가격 업데이트: 분당 60개 (1분 간격 데이터를 위해 증가)
    websocket: 200,      // WebSocket: 분당 200개
    auth: 30             // 인증: 분당 30개
  }
};

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || real || 'unknown';
}

function getEndpointCategory(pathname: string): keyof typeof RATE_LIMIT_CONFIG.maxRequests {
  if (pathname.includes('/api/price-updater') || pathname.includes('/api/chatroom-tokens')) {
    return 'priceUpdate';
  }
  if (pathname.includes('/api/auth')) {
    return 'auth';
  }
  if (pathname.includes('/api/websocket')) {
    return 'websocket';
  }
  if (pathname.includes('/api/rpc-stats') || pathname.includes('/api/solana-rpc')) {
    return 'priceUpdate'; // Use same limit as price updates for RPC-related endpoints
  }
  return 'general';
}

async function checkRateLimit(ip: string, category: keyof typeof RATE_LIMIT_CONFIG.maxRequests): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const limit = RATE_LIMIT_CONFIG.maxRequests[category];
  const windowSeconds = RATE_LIMIT_CONFIG.windowMs / 1000;
  
  return await RedisRateLimiter.checkRateLimit(ip, category, limit, windowSeconds);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API 라우트에만 Rate Limiting 적용
  if (pathname.startsWith('/api/')) {
    const ip = getRateLimitKey(request);
    const category = getEndpointCategory(pathname);
    
    try {
      const rateLimit = await checkRateLimit(ip, category);
      
      // Rate Limit 헤더 추가
      const response = rateLimit.allowed 
        ? NextResponse.next()
        : NextResponse.json(
            { 
              error: 'Too Many Requests',
              message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
              retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            },
            { status: 429 }
          );
      
      response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxRequests[category].toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      if (!rateLimit.allowed) {
        response.headers.set('Retry-After', Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString());
      }
      
      return response;
    } catch (error) {
      console.error('Rate limiting error, allowing request:', error);
      // Rate limiting 에러 시 요청 허용
      return NextResponse.next();
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 