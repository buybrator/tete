import { NextRequest, NextResponse } from 'next/server';

// 🚀 검증된 안정적인 RPC 엔드포인트만 선별
const RPC_ENDPOINTS = [
  // Tier 1: 공식 솔라나 (가장 안정적)
  'https://api.mainnet-beta.solana.com',
  
  // Tier 2: 검증된 무료 서비스들만
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy 데모
  
  // Tier 3: 백업용 (응답 속도는 느리지만 안정적)
  'https://mainnet.rpcpool.com',
];

let currentEndpointIndex = 0;
let lastSuccessfulEndpoint: string | null = null;
let requestCount = 0;
let lastSuccessTime = 0;

// 🚫 실패 엔드포인트 블랙리스트 시스템 (모든 실패 유형 포함)
const failureBlacklist = new Map<string, { 
  blockedUntil: number, 
  failureType: string, 
  failureCount: number 
}>();

// 실패 유형별 블랙리스트 지속시간
const FAILURE_COOLDOWNS = {
  'rate_limit': 5 * 60 * 1000,    // 5분 (Rate limit)
  'forbidden': 10 * 60 * 1000,    // 10분 (403 Forbidden)
  'dns_error': 30 * 60 * 1000,    // 30분 (DNS/ENOTFOUND)
  'cert_error': 60 * 60 * 1000,   // 60분 (Certificate error)
  'timeout': 2 * 60 * 1000,       // 2분 (Timeout)
  'generic': 5 * 60 * 1000,       // 5분 (기타 오류)
};

// 🚀 성공한 엔드포인트 재사용 로직
const SUCCESS_CACHE_DURATION = 3 * 60 * 1000; // 3분간 성공한 엔드포인트 재사용
const MAX_RETRIES = 3; // 최대 3개 엔드포인트만 시도

// 백오프 전략: 요청 실패 시 대기 시간 증가
function getBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 3000); // 최대 3초로 단축
}

// 실패 유형 정의
type FailureType = 'rate_limit' | 'forbidden' | 'dns_error' | 'cert_error' | 'timeout' | 'generic';

// 오류 타입 정의
interface ErrorWithDetails {
  message: string;
  cause?: { code?: string };
  code?: string;
}

// 실패 유형 분류
function categorizeFailure(error: ErrorWithDetails): FailureType {
  const errorMessage = error?.message || '';
  const errorCode = error?.cause?.code || error?.code || '';
  
  if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
    return 'rate_limit';
  }
  if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
    return 'forbidden';
  }
  if (errorCode === 'ENOTFOUND' || errorMessage.includes('getaddrinfo')) {
    return 'dns_error';
  }
  if (errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' || errorMessage.includes('certificate')) {
    return 'cert_error';
  }
  if (errorCode === 'UND_ERR_CONNECT_TIMEOUT' || errorMessage.includes('timeout')) {
    return 'timeout';
  }
  return 'generic';
}

// 엔드포인트가 블랙리스트에 있는지 확인
function isBlacklisted(endpoint: string): boolean {
  const failure = failureBlacklist.get(endpoint);
  if (!failure) return false;
  
  const now = Date.now();
  if (now > failure.blockedUntil) {
    // 차단 해제 시간이 지났으면 블랙리스트에서 제거
    failureBlacklist.delete(endpoint);
    console.log(`✅ ${endpoint} 블랙리스트 해제`);
    return false;
  }
  
  return true;
}

// 실패한 엔드포인트를 블랙리스트에 추가
function addToBlacklist(endpoint: string, error: ErrorWithDetails): void {
  const failureType = categorizeFailure(error);
  const cooldown = FAILURE_COOLDOWNS[failureType];
  const blockUntil = Date.now() + cooldown;
  
  const existing = failureBlacklist.get(endpoint);
  const failureCount = (existing?.failureCount || 0) + 1;
  
  failureBlacklist.set(endpoint, {
    blockedUntil: blockUntil,
    failureType,
    failureCount
  });
  
  console.log(`🚫 ${endpoint} 블랙리스트 추가: ${failureType} (${cooldown / 60000}분간, ${failureCount}회 실패)`);
  
  // 성공 캐시 무효화
  if (lastSuccessfulEndpoint === endpoint) {
    console.log('🗑️ 실패로 인한 성공 캐시 무효화');
    lastSuccessfulEndpoint = null;
    lastSuccessTime = 0;
  }
}

// 최적의 엔드포인트 선택
function getPreferredEndpoint(): string | null {
  const now = Date.now();
  
  // 성공 캐시가 있고 유효하며 블랙리스트에 없으면 사용
  if (lastSuccessfulEndpoint && 
      (now - lastSuccessTime) < SUCCESS_CACHE_DURATION &&
      !isBlacklisted(lastSuccessfulEndpoint)) {
    console.log(`🎯 최근 성공 엔드포인트 재사용: ${lastSuccessfulEndpoint}`);
    return lastSuccessfulEndpoint;
  }
  
  // 블랙리스트에 없는 엔드포인트 찾기
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    const endpoint = RPC_ENDPOINTS[(currentEndpointIndex + i) % RPC_ENDPOINTS.length];
    if (!isBlacklisted(endpoint)) {
      currentEndpointIndex = (currentEndpointIndex + i) % RPC_ENDPOINTS.length;
      console.log(`🔄 건강한 엔드포인트 선택: ${endpoint}`);
      return endpoint;
    }
  }
  
  // 모든 엔드포인트가 블랙리스트에 있다면 null 반환
  console.error('🚫 모든 엔드포인트가 블랙리스트 상태, 요청 중단');
  return null;
}

// RPC 요청을 서버에서 처리 (모든 실패 유형 블랙리스트 적용)
async function makeRpcRequest(body: unknown, retryCount = 0): Promise<unknown> {
  if (retryCount >= MAX_RETRIES) {
    throw new Error(`최대 재시도 횟수 초과 (${MAX_RETRIES}회 시도)`);
  }

  let endpoint: string | null = null;
  
  if (retryCount === 0) {
    // 첫 번째 시도: 최적의 엔드포인트 선택
    endpoint = getPreferredEndpoint();
    if (!endpoint) {
      // 모든 엔드포인트가 블랙리스트에 있으면 즉시 실패
      const blacklistInfo = Array.from(failureBlacklist.entries()).map(([endpoint, failure]) => ({
        endpoint,
        failureType: failure.failureType,
        remainingMs: Math.max(0, failure.blockedUntil - Date.now())
      }));
      
      throw new Error(
        `모든 RPC 엔드포인트가 일시적으로 사용 불가능합니다. ` +
        `잠시 후 다시 시도해주세요.\n블랙리스트 상태: ${JSON.stringify(blacklistInfo, null, 2)}`
      );
    }
  } else {
    // 재시도: 순서대로 시도하되 블랙리스트 체크
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const testEndpoint = RPC_ENDPOINTS[(currentEndpointIndex + i) % RPC_ENDPOINTS.length];
      if (!isBlacklisted(testEndpoint)) {
        endpoint = testEndpoint;
        currentEndpointIndex = (currentEndpointIndex + i) % RPC_ENDPOINTS.length;
        break;
      }
    }
    
    if (!endpoint) {
      throw new Error('재시도 중 사용 가능한 엔드포인트가 없습니다');
    }
  }
  
  // 백오프 지연 적용 (첫 번째 시도는 제외)
  if (retryCount > 0) {
    const delay = getBackoffDelay(retryCount);
    console.log(`⏳ ${delay}ms 대기 후 재시도...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  try {
    requestCount++;
    console.log(`🚀 RPC 요청 #${requestCount} (시도 ${retryCount + 1}/${MAX_RETRIES}): ${endpoint}`);
    
    // 타임아웃 10초로 단축 (빠른 실패)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SolanaApp/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      addToBlacklist(endpoint, error as ErrorWithDetails);
      throw error;
    }

    const data = await response.json();
    
    if (data.error) {
      const rpcError = new Error(`RPC Error: ${JSON.stringify(data.error)}`);
      addToBlacklist(endpoint, rpcError as ErrorWithDetails);
      throw rpcError;
    }

    console.log(`✅ RPC 성공: ${endpoint}`);
    
    // 성공 정보 캐시
    lastSuccessfulEndpoint = endpoint;
    lastSuccessTime = Date.now();
    
    return data;
    
  } catch (error) {
    console.error(`❌ RPC 실패 (${endpoint}):`, error);
    
    // 모든 실패를 블랙리스트에 추가
    addToBlacklist(endpoint, error as ErrorWithDetails);
    
    // 다음 엔드포인트로 전환
    currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    
    // 재시도
    return makeRpcRequest(body, retryCount + 1);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`📡 RPC 프록시 요청: ${body.method} (요청 #${requestCount + 1})`);
    
    const result = await makeRpcRequest(body);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('RPC 프록시 최종 오류:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: -32603, 
          message: error instanceof Error ? error.message : 'Internal error',
          details: {
            requestCount,
            lastSuccessfulEndpoint,
            currentIndex: currentEndpointIndex
          }
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
      method: 'getSlot'
    };
    
    const result = await makeRpcRequest(healthCheck);
    
    // 블랙리스트 정보 생성
    const blacklistInfo = Array.from(failureBlacklist.entries()).map(([endpoint, failure]) => ({
      endpoint,
      failureType: failure.failureType,
      failureCount: failure.failureCount,
      blockedUntil: new Date(failure.blockedUntil).toISOString(),
      remainingMs: Math.max(0, failure.blockedUntil - Date.now())
    }));
    
    return NextResponse.json({
      status: 'healthy',
      currentEndpoint: RPC_ENDPOINTS[currentEndpointIndex],
      lastSuccessful: lastSuccessfulEndpoint,
      requestCount,
      allEndpoints: RPC_ENDPOINTS,
      failureBlacklist: blacklistInfo,
      result
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestCount,
        triedEndpoints: RPC_ENDPOINTS.slice(0, currentEndpointIndex + 1),
        failureBlacklist: Array.from(failureBlacklist.entries()).map(([endpoint, failure]) => ({
          endpoint,
          failureType: failure.failureType,
          failureCount: failure.failureCount,
          blockedUntil: new Date(failure.blockedUntil).toISOString(),
          remainingMs: Math.max(0, failure.blockedUntil - Date.now())
        }))
      },
      { status: 500 }
    );
  }
} 