'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatMessages, addMessage } from '@/hooks/useChatMessages';
import { useMemo } from '@/hooks/useMemo';
import { useTradeSettings } from '@/contexts/TradeSettingsContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOKENS, formatTokenAmount } from '@/lib/tokens';
import { Connection, Transaction, TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';

// 🎯 수수료 설정
const FEE_RECIPIENT_ADDRESS = '9YGfNLAiVNWbkgi9jFunyqQ1Q35yirSEFYsKLN6PP1DG';
const FEE_RATE = 0.0069; // 0.69%

type Props = {
  roomId: string;
};

// 메모 인스트럭션 생성 함수
function createMemoInstruction(memo: string, signer: PublicKey) {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    data: Buffer.from(memo, 'utf8'),
  });
}

// 🎯 수수료 인스트럭션 추가 함수
function addFeeInstruction(transaction: Transaction, fromPubkey: PublicKey, feeAmount: number) {
  console.log(`💰 수수료 인스트럭션 생성: ${feeAmount / 1e9} SOL → ${FEE_RECIPIENT_ADDRESS}`);
  
  const feeInstruction = SystemProgram.transfer({
    fromPubkey: fromPubkey,
    toPubkey: new PublicKey(FEE_RECIPIENT_ADDRESS),
    lamports: feeAmount,
  });
  
  // 수수료 인스트럭션을 트랜잭션 맨 앞에 추가
  transaction.instructions.unshift(feeInstruction);
  console.log(`✅ 수수료 인스트럭션이 트랜잭션 맨 앞에 추가됨`);
}

export default function ChatInput({ roomId }: Props) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendMessage } = useChatMessages(roomId);
  const { settings } = useTradeSettings();
  const { connected, publicKey, signTransaction } = useWallet();
  const {
    sendChatMessage,
    error,
    clearError,
  } = useMemo();

  // Solana 연결 설정
  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/CLIspK_3J2GVAuweafRIUoHzWjyn07rz', 
    { 
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: undefined, // WebSocket 비활성화
      disableRetryOnRateLimit: false,
    }
  );

  // 기본 토큰 주소 상수
  const SOL_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';
  const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  // 🚀 토큰 쌍 정보 계산 (TradeSettingsContext의 selectedToken 활용)
  const getTokenPairInfo = () => {
    const selectedToken = settings.selectedToken;
    
    if (!selectedToken) {
      // 기본값: SOL ↔ USDC
      console.log('🔄 기본 토큰 쌍 사용: SOL ↔ USDC');
      return {
        inputMint: settings.mode === 'buy' ? SOL_TOKEN_ADDRESS : USDC_TOKEN_ADDRESS,
        outputMint: settings.mode === 'buy' ? USDC_TOKEN_ADDRESS : SOL_TOKEN_ADDRESS,
        inputTokenInfo: TOKENS[settings.mode === 'buy' ? 'SOL' : 'USDC'],
        outputTokenInfo: TOKENS[settings.mode === 'buy' ? 'USDC' : 'SOL'],
        inputDecimals: settings.mode === 'buy' ? 9 : 6,
        buttonText: settings.mode === 'buy' ? 'BUY USDC' : 'SELL SOL'
      };
    }

    // 선택된 토큰 사용: SOL ↔ 선택된 토큰
    console.log('🎯 선택된 토큰 쌍 사용:', selectedToken.contractAddress, selectedToken.name);
    
    // 🚀 토큰 심볼 추출 (채팅방 이름에서 실제 토큰 심볼 분리)
    const extractTokenSymbol = (name: string) => {
      // "USDC Trading Room" → "USDC"
      // "BONK Coin Chat" → "BONK"
      // "SOL/USDC Room" → "USDC" (마지막 토큰)
      const words = name.split(' ');
      const firstWord = words[0];
      
      // 일반적인 토큰 심볼은 2-10자 대문자
      if (firstWord && firstWord.length <= 10 && /^[A-Z0-9]+$/.test(firstWord)) {
        return firstWord;
      }
      
      // 실패 시 contractAddress 뒤 4자리 사용
      return selectedToken.contractAddress.slice(-4).toUpperCase();
    };
    
    const tokenSymbol = extractTokenSymbol(selectedToken.name);
    
    const customTokenInfo = {
      address: selectedToken.contractAddress,
      symbol: tokenSymbol,
      name: selectedToken.name,
      decimals: 6, // 대부분의 SPL 토큰은 6 decimals
    };

    return {
      inputMint: settings.mode === 'buy' ? SOL_TOKEN_ADDRESS : selectedToken.contractAddress,
      outputMint: settings.mode === 'buy' ? selectedToken.contractAddress : SOL_TOKEN_ADDRESS,
      inputTokenInfo: settings.mode === 'buy' ? TOKENS.SOL : customTokenInfo,
      outputTokenInfo: settings.mode === 'buy' ? customTokenInfo : TOKENS.SOL,
      inputDecimals: settings.mode === 'buy' ? 9 : 6, // SOL: 9 decimals, 대부분 SPL: 6 decimals
      buttonText: settings.mode === 'buy' ? `BUY ${tokenSymbol}` : `SELL ${tokenSymbol}`
    };
  };

  // 📝 채팅 메시지 전송
  const handleChatSubmit = async () => {
    if (!message.trim() || isLoading) return;

    // 지갑 연결 확인
    if (!connected) {
      toast.error('지갑을 먼저 연결해주세요');
      return;
    }

    setIsLoading(true);
    clearError();
    
    try {
      console.log('📝 채팅 메시지 전송:', message);
      
      // 실제 메모 트랜잭션으로 채팅 메시지 전송
      const result = await sendChatMessage(message);
      
      // 로컬 채팅 상태에도 추가
      sendMessage(message);
      
      // ✅ signature 기반으로 실시간 memo 추출
      if (result.signature) {
        console.log(`🔍 채팅 메모 추출 시작: ${result.signature}`);
      }
      
      setMessage('');
      clearError();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 실제 스왑 실행 (선택된 토큰 쌍 사용)
  const handleTradeSubmit = async () => {
    if (!settings.quantity || isLoading || !connected || !publicKey || !signTransaction) return;

    // 지갑 연결 확인
    if (!connected) {
      toast.error('지갑을 먼저 연결해주세요');
      return;
    }

    // 🔑 메모 내용을 스왑 시작 시점에 저장 (입력 필드 초기화 전에)
    const memoText = message.trim();
    console.log('💾 저장된 메모 텍스트:', memoText);

    setIsLoading(true);
    
    try {
      let quantity = parseFloat(settings.quantity);
      
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('올바른 수량을 입력해주세요');
        setIsLoading(false);
        return;
      }

      // 🚀 동적 토큰 쌍 정보 가져오기
      const tokenPairInfo = getTokenPairInfo();
      
      // 🔄 Sell 모드일 때 퍼센트를 실제 토큰 수량으로 변환
      if (settings.mode === 'sell') {
        if (quantity > 100) {
          toast.error('퍼센트는 100%를 초과할 수 없습니다');
          setIsLoading(false);
          return;
        }
        
        try {
          // 현재 토큰 잔액 조회
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(tokenPairInfo.inputMint)
          });
          
          if (tokenAccounts.value.length === 0) {
            toast.error('해당 토큰의 잔액이 없습니다');
            setIsLoading(false);
            return;
          }
          
          const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          
          if (!tokenBalance || tokenBalance <= 0) {
            toast.error('토큰 잔액이 부족합니다');
            setIsLoading(false);
            return;
          }
          
          // 퍼센트를 실제 수량으로 변환
          quantity = (tokenBalance * quantity) / 100;
          console.log(`📊 ${settings.quantity}% = ${quantity} ${tokenPairInfo.inputTokenInfo.symbol} (잔액: ${tokenBalance})`);
          
        } catch (balanceError) {
          console.error('토큰 잔액 조회 실패:', balanceError);
          toast.error('토큰 잔액을 조회할 수 없습니다');
          setIsLoading(false);
          return;
        }
      }
      
      console.log('🔄 스왑 시작:', {
        mode: settings.mode,
        originalQuantity: settings.quantity,
        actualQuantity: quantity,
        memoText: memoText,
        inputMint: tokenPairInfo.inputMint,
        outputMint: tokenPairInfo.outputMint,
        inputToken: tokenPairInfo.inputTokenInfo.symbol,
        outputToken: tokenPairInfo.outputTokenInfo.symbol
      });

      // amount 계산
      const amount = Math.floor(quantity * Math.pow(10, tokenPairInfo.inputDecimals));

      // 🎯 TradeSettingsPanel Presets에서 설정값 가져오기
      const slippageBps = Math.floor(parseFloat(settings.slippage) * 100); // % to bps 변환
      const priorityFeeLamports = Math.floor(parseFloat(settings.priorityFee) * 1e9); // SOL to lamports 변환
      
      console.log(`📊 Presets 설정값: Slippage ${settings.slippage}% (${slippageBps} bps), Priority ${settings.priorityFee} SOL (${priorityFeeLamports} lamports)`);

      // 1) Jupiter API로 Quote 요청 (Presets 슬리피지 적용)
      console.log("Quote 요청 중...");
      toast.loading("견적 조회 중...", { id: 'swap' });
      
      const quoteRes = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${tokenPairInfo.inputMint}&outputMint=${tokenPairInfo.outputMint}&amount=${amount}&slippageBps=${slippageBps}`
      );
      const quote = await quoteRes.json();
      
      console.log("Quote 응답:", quote);
      
      // Quote에 에러가 있는지 확인
      if (quote.error) {
        console.error("Quote 에러:", quote.error);
        toast.error(`견적 조회 실패: ${quote.error}`, { id: 'swap' });
        return;
      }
      
      console.log("Swap 요청 중...");
      toast.loading("스왑 트랜잭션 준비 중...", { id: 'swap' });
      
      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toBase58(),
          asLegacyTransaction: true,
          prioritizationFeeLamports: priorityFeeLamports, // Presets 우선순위 수수료 적용
        }),
      });
      const swapData = await swapRes.json();
      
      console.log("Swap 응답:", swapData);
      
      // Swap 응답에 에러가 있는지 확인
      if (swapData.error) {
        console.error("Swap 에러:", swapData.error);
        toast.error(`스왑 요청 실패: ${swapData.error}`, { id: 'swap' });
        return;
      }
      
      // swapTransaction이 있는지 확인
      if (!swapData.swapTransaction) {
        console.error("swapTransaction이 응답에 없습니다:", swapData);
        toast.error('스왑 트랜잭션 데이터가 없습니다', { id: 'swap' });
        return;
      }

      // 2) 받은 swapTransaction 디코딩 (Transaction)
      const swapTxBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = Transaction.from(swapTxBuf);

      // 🎯 수수료 처리 (Buy/Sell 모드 모두 적용)
      let feeAmount = 0;
      
      if (settings.mode === 'buy') {
        // Buy 모드: 입력 SOL 수량 기준으로 수수료 계산
        const solAmount = quantity; // 이미 SOL 단위
        feeAmount = Math.floor(solAmount * FEE_RATE * 1e9); // lamports로 변환
        
        console.log(`🔍 Buy 모드 수수료 계산: ${solAmount} SOL의 ${FEE_RATE * 100}% = ${feeAmount / 1e9} SOL`);
      } else {
        // Sell 모드: 출력 SOL 수량 기준으로 수수료 계산
        const expectedOutputSol = parseFloat(formatTokenAmount(quote.outAmount, 9)); // SOL은 9 decimals
        feeAmount = Math.floor(expectedOutputSol * FEE_RATE * 1e9); // lamports로 변환
        
        console.log(`🔍 Sell 모드 수수료 계산: 예상 출력 ${expectedOutputSol} SOL의 ${FEE_RATE * 100}% = ${feeAmount / 1e9} SOL`);
      }
      
      console.log(`💸 수수료 받는 주소: ${FEE_RECIPIENT_ADDRESS}`);
      console.log(`💰 적용될 수수료: ${feeAmount / 1e9} SOL (${feeAmount} lamports)`);
      
      addFeeInstruction(transaction, publicKey, feeAmount);
      console.log(`✅ ${settings.mode.toUpperCase()} 모드 수수료 인스트럭션 추가 완료`);

      // 최신 블록해시로 교체 (재시도 로직 포함)
      console.log("최신 블록해시 조회 중...");
      toast.loading("블록체인 연결 중...", { id: 'swap' });
      
      let blockhash;
      let retryCount = 0;
      const maxRetries = 3;
      
      // 🚀 블록해시 전용 안정적인 연결 사용
      let stableConnection;
      
      while (retryCount < maxRetries) {
        try {
          // 🎯 블록해시 전용 연결 함수 사용
          const { getBlockhashConnection } = await import('@/lib/solana');
          stableConnection = await getBlockhashConnection();
          
          // 더 안정적인 'finalized' commitment 사용
          const latestBlockhash = await stableConnection.getLatestBlockhash('finalized');
          blockhash = latestBlockhash.blockhash;
          console.log(`✅ 블록해시 조회 성공 (시도 ${retryCount + 1}): ${blockhash}`);
          console.log(`🔗 사용된 RPC: ${stableConnection.rpcEndpoint}`);
          break;
        } catch (rpcError: unknown) {
          retryCount++;
          console.warn(`RPC 재시도 ${retryCount}/${maxRetries}:`, rpcError);
          
          if (retryCount >= maxRetries) {
            const errorMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
            throw new Error(`블록체인 연결 실패: ${errorMessage}`);
          }
          
          // 재시도 전 잠시 대기 (지수 백오프)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }

      if (!blockhash || !stableConnection) {
        throw new Error('블록해시 조회에 실패했습니다');
      }

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey; // 혹시 없으면 명시적으로 지정

      // 3) 메모 인스트럭션 추가 (저장된 메모 텍스트 사용)
      if (memoText) {
        transaction.add(createMemoInstruction(memoText, publicKey));
        console.log('메모 추가됨:', memoText);
      }

      // 스왑 정보 계산 및 표시
      const inputAmount = formatTokenAmount(quote.inAmount, tokenPairInfo.inputTokenInfo.decimals);
      const outputAmount = formatTokenAmount(quote.outAmount, tokenPairInfo.outputTokenInfo.decimals);
      
      console.log(`✅ 스왑 준비 완료: ${inputAmount} ${tokenPairInfo.inputTokenInfo.symbol} → ${outputAmount} ${tokenPairInfo.outputTokenInfo.symbol}`);
      
      // 스왑 실행 중 토스트
      toast.loading(`스왑 실행 중... ${inputAmount} ${tokenPairInfo.inputTokenInfo.symbol} → ${outputAmount} ${tokenPairInfo.outputTokenInfo.symbol}`, { id: 'swap' });

      // 4) 서명 및 전송 (동일한 connection 사용)
      const signedTransaction = await signTransaction(transaction);
      console.log(`🚀 트랜잭션 전송 시작 (RPC: ${stableConnection.rpcEndpoint})`);
      const txId = await stableConnection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'finalized', // 블록해시와 동일한 commitment 사용
        maxRetries: 3,
      });
      console.log("트랜잭션 ID:", txId);

      // 5) 트랜잭션 확인 및 채팅 버블 표시
      toast.loading("트랜잭션 확인 중...", { id: 'swap' });
      
      // WebSocket을 사용하지 않는 방식으로 트랜잭션 확인
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30초 동안 시도
      
      while (!confirmed && attempts < maxAttempts) {
        try {
          const status = await connection.getSignatureStatus(txId);
          if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
            confirmed = true;
            console.log("✅ 트랜잭션 확인 완료");
            break;
          }
        } catch (error) {
          console.warn("트랜잭션 상태 확인 중 오류:", error);
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }
      
      // 트랜잭션 확인 완료 후 채팅 버블 표시
      if (confirmed) {
        console.log("🎊 트랜잭션 확인 완료 - 채팅 버블 생성");
        
        console.log('🎊 트랜잭션 확인 완료 - 채팅 버블 생성');
        console.log('📨 roomId:', roomId);
        console.log('📨 txId:', txId);
        console.log('📨 저장할 메모:', memoText);
        
        try {
          // 실제 거래한 SOL 양 계산 (항상 SOL 기준으로 저장)
          let actualSolAmount: string;
          if (settings.mode === 'buy') {
            // Buy 모드: 입력한 SOL 양
            actualSolAmount = quantity.toString();
          } else {
            // Sell 모드: 받은 SOL 양 (outputAmount)
            actualSolAmount = outputAmount;
          }
          
          // addMessage를 직접 사용하여 txHash 포함 및 메모 텍스트 즉시 표시
          const messageData = {
            userId: 'user1',
            userAddress: publicKey?.toString() || 'Unknown',
            avatar: '🎉',
            tradeType: settings.mode as 'buy' | 'sell',
            tradeAmount: actualSolAmount, // 항상 SOL 기준
            content: memoText || '', // 사용자가 입력한 메모 텍스트만 저장
            txHash: txId, // 트랜잭션 해시 포함
          };
          
          console.log('📤 addMessage 호출 직전 - 전달할 데이터:', JSON.stringify(messageData, null, 2));
          
          addMessage(roomId, messageData);
          
          console.log('✅ 채팅 메시지 추가 성공 (txHash 포함)');
          
        } catch (chatError) {
          console.error('❌ 채팅 메시지 추가 실패:', chatError);
        }
        
        // 간단한 성공 토스트
        toast.success(
          `스왑 성공! Solscan에서 확인하기`,
          { 
            id: 'swap',
            duration: 3000,
            action: {
              label: '확인',
              onClick: () => window.open(`https://solscan.io/tx/${txId}`, '_blank')
            }
          }
        );
        
      } else {
        console.warn("⚠️ 트랜잭션 확인 시간 초과");
        console.log('📨 시간 초과 - 저장할 메모:', memoText);
        
        try {
          // 실제 거래한 SOL 양 계산 (항상 SOL 기준으로 저장)
          let actualSolAmount: string;
          if (settings.mode === 'buy') {
            // Buy 모드: 입력한 SOL 양
            actualSolAmount = quantity.toString();
          } else {
            // Sell 모드: 받은 SOL 양 (outputAmount)
            actualSolAmount = outputAmount;
          }
          
          // addMessage를 직접 사용하여 txHash 포함 및 메모 텍스트 즉시 표시
          const messageData = {
            userId: 'user1',
            userAddress: publicKey?.toString() || 'Unknown',
            avatar: '⏱️',
            tradeType: settings.mode as 'buy' | 'sell',
            tradeAmount: actualSolAmount, // 항상 SOL 기준
            content: memoText || '', // 사용자가 입력한 메모 텍스트만 저장
            txHash: txId, // 트랜잭션 해시 포함
          };
          
          console.log('📤 addMessage 호출 직전 - 전달할 데이터:', JSON.stringify(messageData, null, 2));
          
          addMessage(roomId, messageData);
          
          console.log('✅ 시간 초과 채팅 메시지 추가 성공 (txHash 포함)');
        } catch (error) {
          console.error('❌ 시간 초과 채팅 메시지 추가 실패:', error);
        }
        
        toast.warning(
          '트랜잭션이 전송되었지만 확인이 지연되고 있습니다',
          { 
            id: 'swap',
            action: {
              label: 'Solscan에서 확인',
              onClick: () => window.open(`https://solscan.io/tx/${txId}`, '_blank')
            }
          }
        );
      }
      
      // ✅ 완료 후 입력 필드 초기화
      setMessage('');
      clearError();
      
    } catch (err: unknown) {
      console.error('스왑 실행 중 에러 발생:', err);
      
      // 에러 타입에 따른 구체적인 메시지
      let errorMessage = '스왑 실행 중 오류가 발생했습니다';
      
      const errorString = err instanceof Error ? err.message : String(err);
      
      if (errorString.includes('403') || errorString.includes('Forbidden')) {
        errorMessage = 'RPC 서버 접근이 제한되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (errorString.includes('blockhash')) {
        errorMessage = '블록체인 연결에 실패했습니다. 네트워크를 확인해주세요.';
      } else if (errorString.includes('insufficient')) {
        errorMessage = '잔액이 부족합니다.';
      }
      
      toast.error(errorMessage, { id: 'swap' });
    } finally {
      setIsLoading(false);
    }
  };

  // 폼 제출 처리 (채팅 메시지만)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 메시지가 있으면 채팅 메시지로 전송
    if (message.trim()) {
      await handleChatSubmit();
    }
  };

  // 거래 정보가 완전한지 확인
  const isTradeReady = settings.quantity && connected && publicKey && signTransaction;

  // 🚀 동적 버튼 텍스트 계산
  const tokenPairInfo = getTokenPairInfo();

  return (
    <div className="space-y-2">
      {/* 에러 표시 */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input 
          placeholder="메시지를 입력하세요 (선택사항)..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white transition-all duration-200"
          style={{ boxShadow: 'none' }}
          disabled={isLoading}
        />
        
        {/* 🚀 실제 스왑 실행 버튼 (동적 텍스트) */}
        <Button 
          type="button"
          onClick={handleTradeSubmit}
          disabled={!isTradeReady || isLoading}
          className={`h-12 px-6 font-semibold border-2 rounded-xl transition-all duration-200 ${
            settings.mode === 'buy' 
              ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
              : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
          }`}
          style={{ boxShadow: 'none' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              스왑 중...
            </>
          ) : (
            <>
              {settings.mode === 'buy' ? (
                <TrendingUp className="h-4 w-4 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              {tokenPairInfo.buttonText}
              {settings.quantity && ` (${settings.mode === 'sell' ? `${settings.quantity}%` : settings.quantity})`}
              <span className="text-xs opacity-75 ml-1">+0.69% 수수료</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
} 