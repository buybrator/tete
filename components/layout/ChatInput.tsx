'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useMemo } from '@/hooks/useMemo';
import { useTradeSettings } from '@/contexts/TradeSettingsContext';
import { useSwap } from '@/hooks/useSwap';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOKENS, formatTokenAmount } from '@/lib/tokens';

type Props = {
  roomId: string;
};

export default function ChatInput({ roomId }: Props) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendMessage } = useChatMessages(roomId);
  const { settings } = useTradeSettings();
  const { connected } = useWallet();
  const { 
    sendChatMessage, 
    isSending, 
    error, 
    clearError,
    isReady 
  } = useMemo();
  
  // 🔄 Jupiter 스왑 Hook 추가
  const { 
    getQuote, 
    executeSwap, 
    loading: swapLoading, 
    error: swapError,
    quote,
    canSwap,
    reset: resetSwap
  } = useSwap();

  // USDC 토큰 주소
  const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  // 채팅 메시지 전송
  const handleChatSubmit = async () => {
    if (!message.trim() || isLoading || isSending) return;

    setIsLoading(true);
    
    try {
      console.log('Sending chat message:', message);
      
      // 실제 메모 트랜잭션으로 채팅 메시지 전송
      await sendChatMessage(message);
      
      // 로컬 채팅 상태에도 추가
      sendMessage(message, 'buy', '');
      
      setMessage('');
      clearError();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 실제 스왑 실행 (Jupiter Aggregator 사용)
  const handleTradeSubmit = async () => {
    if (!settings.quantity || isLoading || isSending || swapLoading) return;

    // 지갑 연결 확인
    if (!connected) {
      toast.error('지갑을 먼저 연결해주세요');
      return;
    }

    setIsLoading(true);
    resetSwap(); // 이전 스왑 상태 초기화
    
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
        tokenAddress: USDC_TOKEN_ADDRESS
      });

      // 스왑 토큰 결정
      const fromToken = settings.mode === 'buy' ? 'SOL' : 'USDC';
      const toToken = settings.mode === 'buy' ? 'USDC' : 'SOL';
      
      // 1단계: 견적 조회
      toast.loading(`${fromToken} → ${toToken} 견적 조회 중...`, { id: 'swap' });
      
      const quoteResult = await getQuote(fromToken, toToken, quantity);
      
      if (!quoteResult) {
        toast.error('견적 조회에 실패했습니다', { id: 'swap' });
        setIsLoading(false);
        return;
      }

      // 견적 정보 표시
      const fromTokenInfo = TOKENS[fromToken];
      const toTokenInfo = TOKENS[toToken];
      const inputAmount = formatTokenAmount(quoteResult.inAmount, fromTokenInfo.decimals);
      const outputAmount = formatTokenAmount(quoteResult.outAmount, toTokenInfo.decimals);
      
      console.log(`✅ 견적 성공: ${inputAmount} ${fromToken} → ${outputAmount} ${toToken}`);
      
      // 2단계: 스왑 실행
      toast.loading(`스왑 실행 중... ${inputAmount} ${fromToken} → ${outputAmount} ${toToken}`, { id: 'swap' });
      
      const swapResult = await executeSwap(quoteResult, message.trim() || undefined);
      
      if (swapResult.success && swapResult.signature) {
        // 스왑 성공 시 채팅에 메시지 추가
        const swapMessage = `🎉 ${settings.mode === 'buy' ? 'BUY' : 'SELL'} 스왑 완료!\n${inputAmount} ${fromToken} → ${outputAmount} ${toToken}`;
        
        // 채팅에 표시 (메모 내용이 있으면 함께)
        const finalMessage = message.trim() 
          ? `${message}\n\n${swapMessage}`
          : swapMessage;
        
        // 로컬 채팅에 즉시 추가 (블록체인에는 이미 메모로 기록됨)
        sendMessage(finalMessage, settings.mode, `${outputAmount} ${toToken}`);
        
        // 🚀 블록체인 메모 통합: 별도 메모 저장 제거 (이미 스왑 트랜잭션에 포함됨)
        
        toast.success(
          `🎉 ${fromToken} → ${toToken} 스왑 성공!${message.trim() ? ' (메모 포함)' : ''}`,
          { 
            id: 'swap',
            duration: 5000,
            action: {
              label: 'Solscan에서 확인',
              onClick: () => window.open(`https://solscan.io/tx/${swapResult.signature}`, '_blank')
            }
          }
        );
        
        // 입력 필드 초기화
        setMessage('');
        clearError();
        
      } else if (swapResult.signature) {
        // 🚀 트랜잭션 해시가 있으면 성공으로 처리 (확인 실패여도)
        console.log('🟡 트랜잭션 전송 성공, 확인은 미완료');
        
        const swapMessage = `🚀 ${settings.mode === 'buy' ? 'BUY' : 'SELL'} 트랜잭션 전송 완료!\n확인 중... ${inputAmount} ${fromToken} → ${outputAmount} ${toToken}`;
        
        const finalMessage = message.trim() 
          ? `${message}\n\n${swapMessage}`
          : swapMessage;
        
        sendMessage(finalMessage, settings.mode, `${outputAmount} ${toToken}`);
        
        // 🚀 블록체인 메모 통합: 별도 메모 저장 제거 (이미 스왑 트랜잭션에 포함됨)
        
        toast.success(
          `🚀 트랜잭션 전송 완료!${message.trim() ? ' (메모 포함)' : ''} 확인 중...`,
          { 
            id: 'swap',
            duration: 5000,
            action: {
              label: 'Solscan에서 확인',
              onClick: () => window.open(`https://solscan.io/tx/${swapResult.signature}`, '_blank')
            }
          }
        );
        
        setMessage('');
        clearError();
      } else {
        toast.error(`스왑 실패: ${swapResult.error}`, { id: 'swap' });
      }
      
    } catch (err) {
      console.error('Trade submission failed:', err);
      toast.error('스왑 실행 중 오류가 발생했습니다', { id: 'swap' });
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
  const isTradeReady = settings.quantity && connected && canSwap;
  const isChatReady = message.trim() && isReady;
  const isAnyLoading = isLoading || isSending || swapLoading;

  return (
    <div className="space-y-2">
      {/* 에러 표시 */}
      {(error || swapError) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || swapError}
        </div>
      )}

      {/* 스왑 견적 정보 표시 */}
      {quote && (
        <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          💰 견적: {formatTokenAmount(quote.inAmount, settings.mode === 'buy' ? 9 : 6)} {settings.mode === 'buy' ? 'SOL' : 'USDC'} 
          → {formatTokenAmount(quote.outAmount, settings.mode === 'buy' ? 6 : 9)} {settings.mode === 'buy' ? 'USDC' : 'SOL'}
          {quote.priceImpactPct && ` (가격 영향: ${quote.priceImpactPct}%)`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input 
          placeholder="메시지를 입력하세요 (선택사항)..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white transition-all duration-200"
          style={{ boxShadow: 'none' }}
          disabled={isAnyLoading}
        />
        
        {/* 채팅 메시지 전송 버튼 */}
        <Button 
          type="submit" 
          disabled={!isChatReady || isAnyLoading}
          variant="neutral"
          className="h-12 px-4 border-2 rounded-xl transition-all duration-200"
          style={{ boxShadow: 'none' }}
        >
          {isAnyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </Button>

        {/* 🚀 실제 스왑 실행 버튼 */}
        <Button 
          type="button"
          onClick={handleTradeSubmit}
          disabled={!isTradeReady || isAnyLoading}
          className={`h-12 px-6 font-semibold border-2 rounded-xl transition-all duration-200 ${
            settings.mode === 'buy' 
              ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
              : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
          }`}
          style={{ boxShadow: 'none' }}
        >
          {isAnyLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {swapLoading ? '스왑 중...' : '전송중...'}
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