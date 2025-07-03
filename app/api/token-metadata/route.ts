import { NextRequest, NextResponse } from 'next/server';

// 🚀 토큰 메타데이터 CORS 프록시 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uri = searchParams.get('uri');

    if (!uri) {
      return NextResponse.json(
        { error: 'URI parameter is required' },
        { status: 400 }
      );
    }

    // 🔒 보안: 허용된 도메인만 프록시
    const allowedDomains = [
      'static-create.jup.ag',
      'arweave.net',
      'metadata.degods.com',
      'madlads.s3.us-west-2.amazonaws.com',
      'bafybeihewlh5a6p6ujm2gzkdbsw5uh4o7vp7kpjtmqxv2gx5z2n4vf7o7a.ipfs.nftstorage.link',
    ];

    const urlObj = new URL(uri);
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      );
    }

    console.log(`🔗 Proxying metadata request: ${uri}`);

    // 🚀 메타데이터 요청
    const response = await fetch(uri, {
      headers: {
        'User-Agent': 'TradeChatApp/1.0',
        'Accept': 'application/json',
      },
      // 10초 타임아웃
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`❌ Metadata fetch failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch metadata: ${response.status}` },
        { status: response.status }
      );
    }

    const metadata = await response.json();

    console.log(`✅ Metadata fetched successfully from: ${uri}`);

    // 🎯 CORS 헤더와 함께 응답
    return NextResponse.json(metadata, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // 1시간 캐싱
      },
    });

  } catch (error) {
    console.error('❌ Token metadata proxy error:', error);
    
    let errorMessage = 'Failed to fetch token metadata';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        statusCode = 408;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error';
        statusCode = 502;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// OPTIONS 메서드 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 