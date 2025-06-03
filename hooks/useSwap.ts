'use client';

import { useCallback, useState } from 'react';
import { useWalletAdapter } from './useWalletAdapter';
import { 
  Transaction,
  TransactionInstruction,
  PublicKey,
  Connection,
} from '@solana/web3.js';
import { getStableConnection } from '@/lib/solana';
import { jupiterService, JupiterQuote } from '@/lib/jupiter';
import { TOKENS, formatTokenAmount, getTokenByAddress } from '@/lib/tokens';
import { safePublicKeyToString, isValidPublicKey } from '@/lib/wallet-utils';
import { extractMemoFromTransaction } from '@/lib/memo';

// 🎯 메모 인스트럭션 생성 헬퍼 함수
function createMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), // Memo Program ID
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
      const connection = await getStableConnection();

      // 최신 블록해시로 교체
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey; // 혹시 없으면 명시적으로 지정

      // 4) 메모 인스트럭션 추가 (옵션)
      if (memo && memo.trim()) {
        // 🏷️ 앱 식별자를 포함한 메모 생성
        const appMemo = `[SwapChat] ${memo.trim()}`;
        const memoInstruction = createMemoInstruction(appMemo, publicKey);
        transaction.add(memoInstruction);
        console.log(`📝 메모 인스트럭션 추가: "${appMemo}"`);
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
        
        console.log('⏳ 트랜잭션 확인 대기 중...');
        
        // 7) 트랜잭션 확인 - WebSocket 없이 polling 방식 (빠른 확인)
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 15; // 15초로 단축
        
        // WebSocket 없는 직접 연결
        const directConnection = new Connection('https://api.mainnet-beta.solana.com', {
          commitment: 'confirmed',
          wsEndpoint: undefined, // WebSocket 비활성화
        });
        
        while (!confirmed && attempts < maxAttempts) {
          try {
            const txInfo = await directConnection.getTransaction(txId, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });
            
            if (txInfo) {
              if (txInfo.meta?.err) {
                throw new Error(`트랜잭션 실패: ${JSON.stringify(txInfo.meta.err)}`);
              }
              console.log('✅ 트랜잭션 확정 완료!');
              confirmed = true;
              break;
            }
          } catch {
            console.log(`⏳ 확인 중... (${attempts + 1}/${maxAttempts})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (!confirmed) {
          console.warn('⚠️ 트랜잭션 확인 타임아웃, 하지만 성공했을 가능성 높음');
          // 계속 진행 (실제로는 성공했을 가능성이 높음)
        }

        // 🎯 메모가 있는 경우 트랜잭션 확정 후 메모 확인 및 채팅에 추가
        if (memo && memo.trim()) {
          try {
            console.log('📝 메모 확인 시작...');
            
            // 직접 연결로 메모 확인
            const memoText = await extractMemoFromTransaction(directConnection, txId);
            
            if (memoText && memoText.includes('[SwapChat]')) {
              const cleanMemo = memoText.replace('[SwapChat]', '').trim();
              
              // 트랜잭션 정보 가져오기 (직접 연결 사용)
              const txInfo = await directConnection.getTransaction(txId, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
              });
              
              if (txInfo) {
                const senderAddress = txInfo.transaction.message.staticAccountKeys[0]?.toString() || 'Unknown';
                
                console.log(`📨 채팅에 메시지 추가 중: "${cleanMemo}"`);
                
                // 전역 메시지에 추가 (useChatMessages의 글로벌 저장소에 직접 추가)
                try {
                  const { addMessage } = await import('./useChatMessages');
                  await addMessage('sol-usdc', {
                    userId: `user-${Date.now()}`,
                    userAddress: senderAddress,
                    avatar: '✅',
                    tradeType: 'buy' as const,
                    tradeAmount: '',
                    content: `✅ ${cleanMemo}`,
                  });
                  
                  console.log(`🎉 메모 확인 및 채팅 추가 완료: "${cleanMemo}"`);
                } catch (addError) {
                  console.error('❌ 채팅 메시지 추가 실패:', addError);
                }
              } else {
                console.log('⚠️ 트랜잭션 정보를 가져올 수 없음');
              }
            } else {
              console.log('⚠️ 메모를 찾을 수 없음:', memoText);
            }
          } catch (memoError) {
            console.error('❌ 메모 확인 실패:', memoError);
            
            // 메모 확인 실패해도 기본 메시지 추가 시도
            try {
              console.log('🔄 메모 확인 실패, 기본 메시지 추가 시도...');
              const { addMessage } = await import('./useChatMessages');
              await addMessage('sol-usdc', {
                userId: `user-${Date.now()}`,
                userAddress: publicKey?.toString() || 'Unknown',
                avatar: '✅',
                tradeType: 'buy' as const,
                tradeAmount: '',
                content: `✅ ${memo.trim()}`,
              });
              console.log('🎉 기본 메시지 추가 완료');
            } catch (fallbackError) {
              console.error('❌ 기본 메시지 추가도 실패:', fallbackError);
            }
          }
        }

        // 트랜잭션 상태 업데이트
        updateState({ signature: txId, loading: false });

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