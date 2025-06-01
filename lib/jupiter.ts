import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { SWAP_CONFIG } from './tokens';

// 🔄 Jupiter Quote 응답 타입
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

// 🔄 Jupiter Swap 응답 타입
export interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
}

// 🔄 스왑 파라미터 타입
export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: string | number;
  slippageBps?: number;
  userPublicKey: string;
}

// 🌟 Jupiter Aggregator Service
export class JupiterService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = SWAP_CONFIG.JUPITER_API_URL;
  }

  // 💰 스왑 견적 가져오기
  async getQuote(params: SwapParams): Promise<JupiterQuote> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = SWAP_CONFIG.DEFAULT_SLIPPAGE_BPS,
    } = params;

    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.append('inputMint', inputMint);
    url.searchParams.append('outputMint', outputMint);
    url.searchParams.append('amount', amount.toString());
    url.searchParams.append('slippageBps', slippageBps.toString());
    url.searchParams.append('onlyDirectRoutes', 'false');
    url.searchParams.append('asLegacyTransaction', 'false');

    console.log(`🔍 Jupiter Quote 요청: ${url.toString()}`);

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter Quote API 오류: ${response.status} - ${errorText}`);
      }

      const quote = await response.json() as JupiterQuote;
      console.log(`✅ Jupiter Quote 성공:`, {
        input: `${quote.inAmount} ${quote.inputMint}`,
        output: `${quote.outAmount} ${quote.outputMint}`,
        priceImpact: `${quote.priceImpactPct}%`,
      });

      return quote;
      
    } catch (error) {
      console.error(`❌ Jupiter Quote 실패:`, error);
      throw error;
    }
  }

  // 🔄 스왑 트랜잭션 생성
  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapAndUnwrapSol: boolean = true
  ): Promise<JupiterSwapResponse> {
    const url = `${this.baseUrl}/swap`;

    const requestBody = {
      quoteResponse: quote,
      userPublicKey: userPublicKey,
      wrapAndUnwrapSol: wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: SWAP_CONFIG.DEFAULT_PRIORITY_FEE,
    };

    console.log(`🔄 Jupiter Swap 트랜잭션 요청:`, {
      userPublicKey,
      inputMint: quote.inputMint,
      outputMint: quote.outputMint,
      amount: quote.inAmount,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter Swap API 오류: ${response.status} - ${errorText}`);
      }

      const swapResponse = await response.json() as JupiterSwapResponse;
      console.log(`✅ Jupiter Swap 트랜잭션 생성 성공`);

      return swapResponse;
      
    } catch (error) {
      console.error(`❌ Jupiter Swap 실패:`, error);
      throw error;
    }
  }

  // 📊 스왑 시뮬레이션 (실제 실행 없이 결과 미리보기)
  async simulateSwap(params: SwapParams): Promise<{
    quote: JupiterQuote;
    inputAmount: string;
    outputAmount: string;
    priceImpact: string;
    minimumReceived: string;
    routes: string[];
  }> {
    try {
      const quote = await this.getQuote(params);
      
      return {
        quote,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        minimumReceived: quote.otherAmountThreshold,
        routes: quote.routePlan.map(route => route.swapInfo.label),
      };
      
    } catch (error) {
      console.error(`❌ 스왑 시뮬레이션 실패:`, error);
      throw error;
    }
  }

  // 💲 가격 정보 가져오기
  async getPrice(inputMint: string, outputMint: string): Promise<number> {
    try {
      // 1 단위로 견적 요청
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount: Math.pow(10, 6), // 1 토큰 (6 decimals 기준)
        userPublicKey: 'placeholder', // 가격 조회에는 실제 주소 불필요
      });

      const inputAmount = parseFloat(quote.inAmount);
      const outputAmount = parseFloat(quote.outAmount);
      
      return outputAmount / inputAmount;
      
    } catch (error) {
      console.error(`❌ 가격 조회 실패:`, error);
      return 0;
    }
  }
}

// 🌟 글로벌 Jupiter 서비스 인스턴스
export const jupiterService = new JupiterService();

// 🔄 편의 함수들
export async function getSOLtoUSDCQuote(solAmount: number, userPublicKey: string) {
  return jupiterService.getQuote({
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: Math.floor(solAmount * Math.pow(10, 9)), // SOL은 9 decimals
    userPublicKey,
  });
}

export async function getUSDCtoSOLQuote(usdcAmount: number, userPublicKey: string) {
  return jupiterService.getQuote({
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    outputMint: 'So11111111111111111111111111111111111111112', // SOL
    amount: Math.floor(usdcAmount * Math.pow(10, 6)), // USDC는 6 decimals
    userPublicKey,
  });
}

export default {
  JupiterService,
  jupiterService,
  getSOLtoUSDCQuote,
  getUSDCtoSOLQuote,
}; 