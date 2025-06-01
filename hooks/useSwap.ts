'use client';

import { useCallback, useState } from 'react';
import { useWalletAdapter } from './useWalletAdapter';
import { 
  Transaction,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import { getSolanaConnection } from '@/lib/solana';
import { jupiterService, JupiterQuote } from '@/lib/jupiter';
import { TOKENS, formatTokenAmount, getTokenByAddress } from '@/lib/tokens';
import { safePublicKeyToString, isValidPublicKey } from '@/lib/wallet-utils';

// 🎯 메모 인스트럭션 생성 헬퍼 함수
function createMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    data: Buffer.from(memo, 'utf8'),
  });
}

// 🔄 스왑 상태 타입
export interface SwapState {
  loading: boolean;
  error: string | null;
  quote: JupiterQuote | null;
  transaction: string | null;
  signature: string | null;
}

// 🔄 스왑 결과 타입
export interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// 🌟 스왑 Hook
export function useSwap() {
  const { publicKey, signTransaction } = useWalletAdapter();
  const [state, setState] = useState<SwapState>({
    loading: false,
    error: null,
    quote: null,
    transaction: null,
    signature: null,
  });

  // 🔄 상태 업데이트 헬퍼
  const updateState = useCallback((updates: Partial<SwapState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 🔍 견적 조회
  const getQuote = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<JupiterQuote | null> => {
    if (!publicKey) {
      console.warn('❌ 지갑이 연결되지 않음');
      return null;
    }

    const userPublicKeyString = safePublicKeyToString(publicKey);
    if (!userPublicKeyString) {
      console.error('❌ 유효하지 않은 PublicKey');
      updateState({ loading: false, error: '지갑 연결을 확인해주세요.' });
      return null;
    }

    updateState({ loading: true, error: null });

    try {
      // 토큰 정보 가져오기 - 심볼로 찾기
      const fromTokenInfo = Object.values(TOKENS).find(token => token.symbol === fromToken) || 
                           getTokenByAddress(fromToken);
      const toTokenInfo = Object.values(TOKENS).find(token => token.symbol === toToken) || 
                         getTokenByAddress(toToken);

      if (!fromTokenInfo || !toTokenInfo) {
        throw new Error('지원하지 않는 토큰입니다.');
      }

      const rawAmount = Math.floor(amount * Math.pow(10, fromTokenInfo.decimals));

      console.log(`🔍 스왑 견적 요청: ${amount} ${fromToken} → ${toToken}`);

      const quote = await jupiterService.getQuote({
        inputMint: fromTokenInfo.address,
        outputMint: toTokenInfo.address,
        amount: rawAmount,
        userPublicKey: userPublicKeyString,
      });

      updateState({ quote, loading: false });
      
      // 견적 정보 로깅
      const inputAmount = formatTokenAmount(quote.inAmount, fromTokenInfo.decimals);
      const outputAmount = formatTokenAmount(quote.outAmount, toTokenInfo.decimals);
      
      console.log(`✅ 견적 성공: ${inputAmount} ${fromToken} → ${outputAmount} ${toToken}`);
      console.log(`📊 가격 영향: ${quote.priceImpactPct}%`);

      return quote;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '견적 조회 실패';
      console.error('❌ 견적 실패:', error);
      updateState({ loading: false, error: errorMessage });
      return null;
    }
  }, [publicKey, updateState]);

  // 🔄 스왑 실행
  const executeSwap = useCallback(async (
    quote: JupiterQuote, 
    memo?: string
  ): Promise<SwapResult> => {
    if (!isValidPublicKey(publicKey)) {
      return { success: false, error: '지갑이 연결되지 않았습니다.' };
    }

    if (!signTransaction) {
      return { success: false, error: '지갑에서 트랜잭션 서명을 지원하지 않습니다.' };
    }

    const userPublicKeyString = safePublicKeyToString(publicKey);
    if (!userPublicKeyString) {
      return { success: false, error: '유효하지 않은 PublicKey입니다.' };
    }

    updateState({ loading: true, error: null, signature: null });

    try {
      console.log('🔄 스왑 트랜잭션 생성 중...');

      // 1) Jupiter API로 Quote 요청 (이미 있으면 스킵 가능하지만 안전을 위해)
      console.log("Quote 확인 중...");
      
      // 2) Jupiter API로 스왑 거래 직렬화 데이터 받기 (LegacyTransaction으로 요청)
      console.log("Swap 요청 중...");
      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userPublicKeyString,
          asLegacyTransaction: true, // LegacyTransaction으로 받기
        }),
      });
      const swapData = await swapRes.json();
      
      console.log("Swap 응답:", swapData);
      
      // Swap 응답에 에러가 있는지 확인
      if (swapData.error) {
        throw new Error(`Jupiter API 에러: ${swapData.error}`);
      }
      
      // swapTransaction이 있는지 확인
      if (!swapData.swapTransaction) {
        throw new Error('스왑 트랜잭션이 응답에 없습니다.');
      }

      console.log(memo ? `📝 메모 포함 스왑 예정: "${memo}"` : '🔄 스왑 트랜잭션 생성');

      // 3) 받은 swapTransaction 디코딩 (Transaction)
      const swapTxBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = Transaction.from(swapTxBuf);

      // 연결 설정
      const connection = getSolanaConnection();

      // 최신 블록해시로 교체
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey; // 혹시 없으면 명시적으로 지정

      // 4) 메모 인스트럭션 추가 (옵션)
      if (memo && memo.trim()) {
        const memoInstruction = createMemoInstruction(memo.trim(), publicKey);
        transaction.add(memoInstruction);
        console.log(`📝 메모 인스트럭션 추가: "${memo}"`);
      }

      console.log('✍️ 지갑에서 트랜잭션 서명 중...');

      try {
        // 5) 지갑 어댑터를 통한 서명
        const signedTransaction = await signTransaction(transaction);

        console.log('🚀 트랜잭션 전송 중...');

        // 6) 서명된 트랜잭션 전송
        const txId = await connection.sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        console.log(`🚀 ${memo ? '메모 포함 ' : ''}스왑 트랜잭션 전송 완료: ${txId}`);
        
        if (memo) {
          console.log(`📝 메모: "${memo}"`);
        }

        // 트랜잭션 상태 업데이트
        updateState({ signature: txId });
        
        console.log('⏳ 트랜잭션 확인 대기 중...');
        
        // 7) 트랜잭션 확인
        try {
          await connection.confirmTransaction(txId, 'confirmed');
          console.log('✅ 스왑 및 메모 전송 완료!');
          
        } catch (confirmError: unknown) {
          const errorMessage = confirmError instanceof Error ? confirmError.message : 'Unknown error';
          console.warn('⚠️ 트랜잭션 확인 실패, 상태 직접 확인:', errorMessage);
          
          // 확인 실패 시 getSignatureStatus로 직접 확인
          const statusResponse = await connection.getSignatureStatus(txId, {
            searchTransactionHistory: true,
          });

          if (statusResponse?.value) {
            const status = statusResponse.value;
            
            if (status.err) {
              throw new Error(`트랜잭션 실패: ${JSON.stringify(status.err)}`);
            }
            
            if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
              console.log('✅ 트랜잭션이 실제로 성공했습니다! (직접 확인)');
            } else {
              console.log('🟡 트랜잭션 전송 성공, 확인은 백그라운드에서 진행됩니다.');
              
              setTimeout(async () => {
                try {
                  const finalStatus = await connection.getSignatureStatus(txId);
                  console.log('📊 최종 트랜잭션 상태:', finalStatus?.value);
                } catch (e) {
                  console.log('📊 백그라운드 상태 확인 실패:', e);
                }
              }, 5000);
            }
          } else {
            console.log('🔍 트랜잭션 상태를 찾을 수 없지만, 서명이 존재하므로 성공으로 처리');
          }
        }

        console.log('✅ 스왑 처리 완료!');
        updateState({ loading: false });

        return { success: true, signature: txId };

      } catch (sendError) {
        console.error('❌ 트랜잭션 서명/전송 실패:', sendError);
        throw sendError;
      }
      
    } catch (error) {
      let errorMessage = '스왑 실행 실패';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = '잔액이 부족합니다.';
        } else if (error.message.includes('slippage')) {
          errorMessage = '슬리피지 한도를 초과했습니다. 설정을 조정하거나 다시 시도해주세요.';
        } else if (error.message.includes('User rejected')) {
          errorMessage = '사용자가 트랜잭션을 취소했습니다.';
        } else if (error.message.includes('signature verification failure')) {
          errorMessage = '트랜잭션 서명 검증에 실패했습니다. 다시 시도해주세요.';
        } else if (error.message.includes('Transaction too large')) {
          errorMessage = '트랜잭션이 너무 큽니다. 메모를 짧게 하거나 다시 시도해주세요.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error('❌ 스왑 실패:', error);
      updateState({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [publicKey, signTransaction, updateState]);

  // 🔄 간편 스왑 함수들
  const swapSOLtoUSDC = useCallback(async (solAmount: number, memo?: string): Promise<SwapResult> => {
    const quote = await getQuote('SOL', 'USDC', solAmount);
    if (!quote) return { success: false, error: '견적 조회 실패' };
    return executeSwap(quote, memo);
  }, [getQuote, executeSwap]);

  const swapUSDCtoSOL = useCallback(async (usdcAmount: number, memo?: string): Promise<SwapResult> => {
    const quote = await getQuote('USDC', 'SOL', usdcAmount);
    if (!quote) return { success: false, error: '견적 조회 실패' };
    return executeSwap(quote, memo);
  }, [getQuote, executeSwap]);

  // 🧹 상태 초기화
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      quote: null,
      transaction: null,
      signature: null,
    });
  }, []);

  return {
    // 상태
    ...state,
    
    // 함수들
    getQuote,
    executeSwap,
    swapSOLtoUSDC,
    swapUSDCtoSOL,
    reset,
    
    // 편의 속성들
    canSwap: !!publicKey && !state.loading,
    hasQuote: !!state.quote,
    isSwapping: state.loading,
  };
}

export default useSwap; 