import { Connection, PublicKey, LAMPORTS_PER_SOL, Commitment } from '@solana/web3.js';

// 솔라나 네트워크 타입 정의
export type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet';

// ⚡ 더 많은 안정적인 무료 RPC 엔드포인트 (403 오류 해결을 위해 확대)
const MAINNET_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com', // 공식 RPC (진짜 무료)
  'https://solana-api.projectserum.com', // Project Serum (무료)
  'https://api.metaplex.solana.com', // Metaplex (무료)
  'https://rpc.public.solana.com', // 공개 RPC
  'https://solana-mainnet.core.chainstack.com', // Chainstack 무료 티어
];

const DEVNET_RPC_ENDPOINTS = [
  'https://api.devnet.solana.com', // 공식 Devnet RPC (무료)
  'https://devnet.solana.com', // 공식 대체 주소
];

const TESTNET_RPC_ENDPOINTS = [
  'https://api.testnet.solana.com', // 공식 Testnet RPC
];

// 네트워크 설정 (환경 변수 무시하고 강제로 첫 번째 RPC 사용)
export const NETWORK_CONFIG = {
  mainnet: {
    name: 'Mainnet Beta',
    urls: MAINNET_RPC_ENDPOINTS,
    url: MAINNET_RPC_ENDPOINTS[0], // 강제로 공식 RPC 사용
    commitment: 'confirmed' as Commitment,
  },
  devnet: {
    name: 'Devnet', 
    urls: DEVNET_RPC_ENDPOINTS,
    url: DEVNET_RPC_ENDPOINTS[0], // 강제로 공식 RPC 사용
    commitment: 'confirmed' as Commitment,
  },
  testnet: {
    name: 'Testnet',
    urls: TESTNET_RPC_ENDPOINTS,
    url: TESTNET_RPC_ENDPOINTS[0], // 강제로 공식 RPC 사용
    commitment: 'confirmed' as Commitment,
  },
} as const;

// Memo Program ID
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

// 현재 네트워크 가져오기 (기본값: mainnet)
export function getCurrentNetwork(): SolanaNetwork {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork;
  if (!network || !['mainnet', 'devnet', 'testnet'].includes(network)) {
    console.log('🔧 Using default network: mainnet');
    return 'mainnet'; // devnet 대신 mainnet 기본값으로 변경
  }
  return network;
}

// 🚀 서버사이드 프록시를 사용하는 Connection 생성 (IP 차단 완전 우회)
export function createSolanaConnection(network?: SolanaNetwork): Connection {
  const currentNetwork = network || getCurrentNetwork();
  
  // 브라우저 환경에서는 프록시 사용, 서버에서는 직접 연결
  let endpoint: string;
  
  if (typeof window !== 'undefined') {
    // 브라우저 환경: 프록시 사용
    endpoint = `${window.location.origin}/api/solana-rpc`;
    console.log(`🚀 Creating Solana connection via browser proxy: ${endpoint} (${currentNetwork})`);
  } else {
    // 서버 환경: 직접 연결
    const config = NETWORK_CONFIG[currentNetwork];
    endpoint = config.url;
    console.log(`🚀 Creating Solana connection via server: ${endpoint} (${currentNetwork})`);
  }
  
  return new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

// RPC 엔드포인트 자동 선택 (이제 프록시에서 처리되므로 단순화)
export async function findHealthyRpcEndpoint(network: SolanaNetwork): Promise<string | null> {
  console.log(`🔍 Using proxy for ${network}, no direct endpoint testing needed`);
  return '/api/solana-rpc';
}

// 안정적인 Connection 생성 (프록시 사용)
export async function createStableConnection(network?: SolanaNetwork): Promise<Connection> {
  const currentNetwork = network || getCurrentNetwork();
  
  console.log(`🔧 Creating stable connection for ${currentNetwork}...`);
  
  return createSolanaConnection(currentNetwork);
}

// 기본 Connection 인스턴스 (싱글톤)
let connection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (!connection) {
    connection = createSolanaConnection();
  }
  return connection;
}

// 네트워크 전환
export function switchNetwork(network: SolanaNetwork): Connection {
  console.log(`🔄 Switching to ${network} network...`);
  connection = createSolanaConnection(network);
  return connection;
}

// Solana 연결 상태 확인
export async function checkSolanaConnection(conn?: Connection): Promise<{
  connected: boolean;
  network: string;
  blockHeight?: number;
  error?: string;
}> {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const blockHeight = await solanaConnection.getBlockHeight();
    const currentNetwork = getCurrentNetwork();
    
    return {
      connected: true,
      network: NETWORK_CONFIG[currentNetwork].name,
      blockHeight,
    };
  } catch (error) {
    console.error('Solana connection check failed:', error);
    return {
      connected: false,
      network: NETWORK_CONFIG[getCurrentNetwork()].name,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 계정 잔고 조회 (SOL)
export async function getAccountBalance(
  publicKey: PublicKey,
  conn?: Connection
): Promise<number> {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const balance = await solanaConnection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get account balance:', error);
    throw error;
  }
}

// 계정 정보 조회
export async function getAccountInfo(
  publicKey: PublicKey,
  conn?: Connection
) {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const accountInfo = await solanaConnection.getAccountInfo(publicKey);
    return accountInfo;
  } catch (error) {
    console.error('Failed to get account info:', error);
    throw error;
  }
}

// 최신 블록해시 조회
export async function getLatestBlockhash(conn?: Connection) {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const latestBlockHash = await solanaConnection.getLatestBlockhash();
    return latestBlockHash;
  } catch (error) {
    console.error('Failed to get latest blockhash:', error);
    throw error;
  }
}

// 트랜잭션 확인
export async function confirmTransaction(
  signature: string,
  conn?: Connection
): Promise<boolean> {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const result = await solanaConnection.confirmTransaction(signature);
    return !result.value.err;
  } catch (error) {
    console.error('Failed to confirm transaction:', error);
    return false;
  }
}

// 네트워크 통계 정보
export async function getNetworkStats(conn?: Connection) {
  try {
    const solanaConnection = conn || getSolanaConnection();
    const [blockHeight, epochInfo, supply] = await Promise.all([
      solanaConnection.getBlockHeight(),
      solanaConnection.getEpochInfo(),
      solanaConnection.getSupply(),
    ]);

    return {
      blockHeight,
      epochInfo,
      supply: {
        total: supply.value.total / LAMPORTS_PER_SOL,
        circulating: supply.value.circulating / LAMPORTS_PER_SOL,
        nonCirculating: supply.value.nonCirculating / LAMPORTS_PER_SOL,
      },
    };
  } catch (error) {
    console.error('Failed to get network stats:', error);
    throw error;
  }
}

// 연결 상태 모니터링
export class SolanaConnectionMonitor {
  private connection: Connection;
  private isMonitoring = false;
  private onStatusChange?: (status: { connected: boolean; error?: string }) => void;

  constructor(connection?: Connection) {
    this.connection = connection || getSolanaConnection();
  }

  startMonitoring(onStatusChange: (status: { connected: boolean; error?: string }) => void) {
    this.onStatusChange = onStatusChange;
    this.isMonitoring = true;
    this.checkStatus();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.onStatusChange = undefined;
  }

  private async checkStatus() {
    if (!this.isMonitoring) return;

    try {
      await this.connection.getBlockHeight();
      this.onStatusChange?.({ connected: true });
    } catch (error) {
      this.onStatusChange?.({
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }

    // 30초마다 상태 체크
    if (this.isMonitoring) {
      setTimeout(() => this.checkStatus(), 30000);
    }
  }
}

export default {
  createConnection: createSolanaConnection,
  getConnection: getSolanaConnection,
  switchNetwork,
  checkConnection: checkSolanaConnection,
  getAccountBalance,
  getAccountInfo,
  getLatestBlockhash,
  confirmTransaction,
  getNetworkStats,
  getCurrentNetwork,
  NETWORK_CONFIG,
  MEMO_PROGRAM_ID,
  SolanaConnectionMonitor,
}; 