import { NextRequest, NextResponse } from 'next/server';
import { getTokenMetadataCacheStats, clearTokenMetadataCache } from '@/lib/tokenMetadata';
import { tokenMetadataCache } from '@/lib/tokenMetadataCache';

export async function GET() {
  try {
    const stats = getTokenMetadataCacheStats();
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        message: 'Token metadata cache statistics retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearTokenMetadataCache();
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Token metadata cache cleared successfully'
      }
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tokenAddresses } = body;

    if (action === 'preheat' && Array.isArray(tokenAddresses)) {
      // 캐시 예열
      const { fetchTokenMetadata } = await import('@/lib/tokenMetadata');
      
      await tokenMetadataCache.preheat(tokenAddresses, async (address) => {
        return await fetchTokenMetadata(address);
      });

      return NextResponse.json({
        success: true,
        data: {
          message: `Preheated cache with ${tokenAddresses.length} tokens`,
          tokens: tokenAddresses
        }
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid action',
        details: 'Supported actions: preheat'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process cache action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process cache action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}