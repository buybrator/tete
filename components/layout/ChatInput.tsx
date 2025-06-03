'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatMessages, addTemporaryMessage, addMessage } from '@/hooks/useChatMessages';
import { useMemo } from '@/hooks/useMemo';
import { useTradeSettings } from '@/contexts/TradeSettingsContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOKENS, formatTokenAmount } from '@/lib/tokens';
import { Connection, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import fetch from 'cross-fetch';

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
    isReady 
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

  // 토큰 주소 상수
  const SOL_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';
  const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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
      sendMessage(message, 'buy', '');
      
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

  // 🚀 실제 스왑 실행 (Jupiter Aggregator 사용 - swap_with_memo.ts 구조)
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
    console.log('💾 원본 message 변수:', message);
    console.log('💾 memoText 길이:', memoText.length);
    console.log('💾 memoText 내용 확인:', JSON.stringify(memoText));

    setIsLoading(true);
    
    try {
      const quantity = parseFloat(settings.quantity);
      
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('올바른 수량을 입력해주세요');
        setIsLoading(false);
        return;
      }

      console.log('🔄 스왑 시작:', {
        mode: settings.mode,
        quantity,
        memoText: memoText
      });

      // 토큰 주소 설정
      const inputMint = settings.mode === 'buy' ? SOL_TOKEN_ADDRESS : USDC_TOKEN_ADDRESS;
      const outputMint = settings.mode === 'buy' ? USDC_TOKEN_ADDRESS : SOL_TOKEN_ADDRESS;
      
      // amount 계산 (SOL: 9 decimals, USDC: 6 decimals)
      const decimals = settings.mode === 'buy' ? 9 : 6;
      const amount = Math.floor(quantity * Math.pow(10, decimals));

      // 1) Jupiter API로 스왑 거래 직렬화 데이터 받기 (LegacyTransaction으로 요청)
      console.log("Quote 요청 중...");
      toast.loading("견적 조회 중...", { id: 'swap' });
      
      const quoteRes = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=3000`
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
          asLegacyTransaction: true, // LegacyTransaction으로 받기
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

      // 최신 블록해시로 교체 (재시도 로직 포함)
      console.log("최신 블록해시 조회 중...");
      toast.loading("블록체인 연결 중...", { id: 'swap' });
      
      let blockhash;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const latestBlockhash = await connection.getLatestBlockhash();
          blockhash = latestBlockhash.blockhash;
          break;
        } catch (rpcError: unknown) {
          retryCount++;
          console.warn(`RPC 재시도 ${retryCount}/${maxRetries}:`, rpcError);
          
          if (retryCount >= maxRetries) {
            const errorMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
            throw new Error(`블록체인 연결 실패: ${errorMessage}`);
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!blockhash) {
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
      const fromTokenInfo = TOKENS[settings.mode === 'buy' ? 'SOL' : 'USDC'];
      const toTokenInfo = TOKENS[settings.mode === 'buy' ? 'USDC' : 'SOL'];
      const inputAmount = formatTokenAmount(quote.inAmount, fromTokenInfo.decimals);
      const outputAmount = formatTokenAmount(quote.outAmount, toTokenInfo.decimals);
      
      console.log(`✅ 스왑 준비 완료: ${inputAmount} ${fromTokenInfo.symbol} → ${outputAmount} ${toTokenInfo.symbol}`);
      
      // 스왑 실행 중 토스트
      toast.loading(`스왑 실행 중... ${inputAmount} ${fromTokenInfo.symbol} → ${outputAmount} ${toTokenInfo.symbol}`, { id: 'swap' });

      // 4) 서명 및 전송
      const signedTransaction = await signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signedTransaction.serialize());
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
        
        // 스왑 정보 계산
        const swapMessage = `🎉 ${settings.mode === 'buy' ? 'BUY' : 'SELL'} 스왑 완료!\n${inputAmount} ${fromTokenInfo.symbol} → ${outputAmount} ${toTokenInfo.symbol}`;
        
        // 채팅에 표시할 최종 메시지 (메모 포함)
        let finalMessage;
        if (memoText) {
          finalMessage = `💬 ${memoText}\n\n${swapMessage}`;
          console.log('✅ 메모가 포함된 스왑 완료:', memoText);
        } else {
          finalMessage = swapMessage;
          console.log('✅ 메모 없는 스왑 완료');
        }
        
        console.log('📨 채팅 버블 생성:', finalMessage);
        console.log('📨 finalMessage 길이:', finalMessage.length);
        console.log('📨 finalMessage 내용 확인:', JSON.stringify(finalMessage));
        console.log('📨 roomId:', roomId);
        console.log('📨 txId:', txId);
        
        try {
          // addMessage를 직접 사용하여 txHash 포함 및 메모 텍스트 즉시 표시
          const messageData = {
            userId: 'user1',
            userAddress: publicKey?.toString() || 'Unknown',
            avatar: '🎉',
            tradeType: settings.mode as 'buy' | 'sell',
            tradeAmount: `${outputAmount} ${toTokenInfo.symbol}`,
            content: finalMessage, // 메모 텍스트가 포함된 전체 메시지
            txHash: txId, // 트랜잭션 해시 포함
          };
          
          console.log('📤 addMessage 호출 직전 - 전달할 데이터:', JSON.stringify(messageData, null, 2));
          console.log('📤 messageData.content:', messageData.content);
          
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
        
        // 시간 초과 시에도 채팅 버블 표시 (전송은 완료되었을 가능성)
        const swapMessage = `⏱️ ${settings.mode === 'buy' ? 'BUY' : 'SELL'} 스왑 전송 완료!\n${inputAmount} ${fromTokenInfo.symbol} → ${outputAmount} ${toTokenInfo.symbol}\n(확인 대기 중...)`;
        
        let finalMessage;
        if (memoText) {
          finalMessage = `💬 ${memoText}\n\n${swapMessage}`;
          console.log('✅ 시간 초과 - 메모가 포함된 메시지:', memoText);
        } else {
          finalMessage = swapMessage;
          console.log('✅ 시간 초과 - 메모 없는 메시지');
        }
        
        try {
          // addMessage를 직접 사용하여 txHash 포함 및 메모 텍스트 즉시 표시
          const messageData = {
            userId: 'user1',
            userAddress: publicKey?.toString() || 'Unknown',
            avatar: '⏱️',
            tradeType: settings.mode as 'buy' | 'sell',
            tradeAmount: `${outputAmount} ${toTokenInfo.symbol}`,
            content: finalMessage, // 메모 텍스트가 포함된 전체 메시지
            txHash: txId, // 트랜잭션 해시 포함
          };
          
          console.log('📤 addMessage 호출 직전 - 전달할 데이터:', JSON.stringify(messageData, null, 2));
          console.log('📤 messageData.content:', messageData.content);
          
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
  const isChatReady = message.trim() && isReady;

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
        
        {/* 채팅 메시지 전송 버튼 */}
        <Button 
          type="submit" 
          disabled={!isChatReady || isLoading}
          variant="neutral"
          className="h-12 px-4 border-2 rounded-xl transition-all duration-200"
          style={{ boxShadow: 'none' }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </Button>

        {/* 🚀 실제 스왑 실행 버튼 */}
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
              {settings.mode === 'buy' ? 'BUY USDC' : 'SELL SOL'}
              {settings.quantity && ` (${settings.quantity})`}
            </>
          )}
        </Button>
      </form>
    </div>
  );
} 