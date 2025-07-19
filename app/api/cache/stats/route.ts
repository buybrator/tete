import { NextResponse } from 'next/server';
import { CacheManager } from '@/lib/cache-manager';
import { RedisRateLimiter } from '@/lib/rate-limiter-redis';

export async function GET() {
  try {
    const [cacheStats, rateLimitStats] = await Promise.all([
      CacheManager.getCacheStats(),
      RedisRateLimiter.getRateLimitStats('general')
    ]);

    return NextResponse.json({
      success: true,
      data: {
        cache: cacheStats,
        rateLimit: rateLimitStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}