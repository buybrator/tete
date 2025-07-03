import { NextRequest, NextResponse } from 'next/server';

// 🎯 Rate Limiting 설정
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1분 윈도우
  maxRequests: {
    general: 100,        // 일반 API: 분당 100개
    priceUpdate: 10,     // 가격 업데이트: 분당 10개
    websocket: 200,      // WebSocket: 분당 200개
    auth: 30             // 인증: 분당 30개
  }
};

// IP별 요청 카운터 (실제 운영에서는 Redis 사용 권장)
const requestCounts = new Map<string, Map<string, { count: number; resetTime: number }>>();

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
  return 'general';
}

function checkRateLimit(ip: string, category: keyof typeof RATE_LIMIT_CONFIG.maxRequests): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, new Map());
  }
  
  const userCounts = requestCounts.get(ip)!;
  const categoryData = userCounts.get(category);
  
  // 윈도우가 만료되었거나 데이터가 없으면 리셋
  if (!categoryData || categoryData.resetTime <= now) {
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    userCounts.set(category, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests[category] - 1,
      resetTime
    };
  }
  
  // 제한 확인
  const maxRequests = RATE_LIMIT_CONFIG.maxRequests[category];
  if (categoryData.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: categoryData.resetTime
    };
  }
  
  // 카운트 증가
  categoryData.count++;
  return {
    allowed: true,
    remaining: maxRequests - categoryData.count,
    resetTime: categoryData.resetTime
  };
}

// 오래된 데이터 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [ip, userCounts] of requestCounts.entries()) {
    for (const [category, data] of userCounts.entries()) {
      if (data.resetTime <= now) {
        userCounts.delete(category);
      }
    }
    if (userCounts.size === 0) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API 라우트에만 Rate Limiting 적용
  if (pathname.startsWith('/api/')) {
    const ip = getRateLimitKey(request);
    const category = getEndpointCategory(pathname);
    const rateLimit = checkRateLimit(ip, category);
    
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
      console.warn(`🚫 Rate Limit 초과: ${ip} - ${category} (${pathname})`);
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 