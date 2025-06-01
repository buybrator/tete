import { NextRequest, NextResponse } from 'next/server';

// 🚀 서버사이드에서 Solana RPC를 프록시 (IP 차단 우회)
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://api.metaplex.solana.com',
  'https://rpc.public.solana.com',
  'https://solana-mainnet.core.chainstack.com',
];

let currentEndpointIndex = 0;

// RPC 요청을 서버에서 처리 (IP 차단 우회)
async function makeRpcRequest(body: unknown, retryCount = 0): Promise<unknown> {
  if (retryCount >= RPC_ENDPOINTS.length) {
    throw new Error('모든 RPC 엔드포인트에서 실패');
  }

  const endpoint = RPC_ENDPOINTS[currentEndpointIndex];
  
  try {
    console.log(`🚀 서버사이드 RPC 요청: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TradeChat/1.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
    }

    console.log(`✅ RPC 성공: ${endpoint}`);
    return data;
    
  } catch (error) {
    console.error(`❌ RPC 실패 (${endpoint}):`, error);
    
    // 다음 엔드포인트로 전환
    currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    
    // 재시도
    return makeRpcRequest(body, retryCount + 1);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`📡 RPC 프록시 요청: ${body.method}`);
    
    const result = await makeRpcRequest(body);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('RPC 프록시 오류:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: -32603, 
          message: error instanceof Error ? error.message : 'Internal error' 
        } 
      },
      { status: 500 }
    );
  }
}

// GET 요청도 지원 (건강성 체크용)
export async function GET() {
  try {
    const healthCheck = {
      jsonrpc: '2.0',
      id: 'health',
      method: 'getHealth'
    };
    
    const result = await makeRpcRequest(healthCheck);
    
    return NextResponse.json({
      status: 'healthy',
      currentEndpoint: RPC_ENDPOINTS[currentEndpointIndex],
      result
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 