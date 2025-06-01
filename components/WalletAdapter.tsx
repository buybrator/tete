'use client';

import { useState } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAdapter } from '@/hooks/useWalletAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, RefreshCw, Wallet, X, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safePublicKeyToString, formatWalletAddress } from '@/lib/wallet-utils';

interface WalletAdapterProps {
  className?: string;
  showBalance?: boolean;
  showActions?: boolean;
}

export default function WalletAdapter({ 
  className = '', 
  showBalance = true, 
  showActions = true 
}: WalletAdapterProps) {
  const { setVisible } = useWalletModal();
  
  const {
    publicKey,
    isConnected,
    isConnecting,
    isDisconnecting,
    walletName,
    balance,
    isLoadingBalance,
    error,
    connect,
    disconnect,
    sendSol,
    fetchBalance,
    clearError,
    formatBalance,
  } = useWalletAdapter();

  // SOL 전송 상태
  const [isSending, setIsSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  // 지갑 선택 모달 열기
  const handleSelectWallet = () => {
    connect();
  };

  // 주소 복사
  const copyAddress = async () => {
    const address = safePublicKeyToString(publicKey);
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        // TODO: 토스트 알림 추가
        console.log('주소가 복사되었습니다');
      } catch (error) {
        console.error('주소 복사 실패:', error);
      }
    }
  };

  // Solana Explorer 열기
  const openExplorer = () => {
    const address = safePublicKeyToString(publicKey);
    if (address) {
      const url = `https://solscan.io/account/${address}`;
      window.open(url, '_blank');
    }
  };

  // SOL 전송
  const handleSendSol = async () => {
    if (!recipient || !amount) {
      alert('받는 주소와 금액을 입력해주세요');
      return;
    }

    try {
      setIsSending(true);
      const signature = await sendSol(recipient, parseFloat(amount));
      
      // 성공 메시지
      alert(`전송 완료!\n트랜잭션: ${signature}`);
      
      // 입력 초기화
      setRecipient('');
      setAmount('');
      setSendDialogOpen(false);
    } catch (error) {
      console.error('SOL 전송 실패:', error);
      alert(`전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button
              variant="neutral"
              size="sm"
              onClick={clearError}
              className="h-auto p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 지갑 연결되지 않은 상태 */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              지갑 연결
            </CardTitle>
            <CardDescription>
              Solana 지갑을 연결하여 거래를 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleSelectWallet}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? '연결 중...' : '지갑 선택'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 지갑 연결된 상태 */}
      {isConnected && publicKey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                연결된 지갑
              </div>
              {walletName && (
                <Badge variant="neutral">{walletName}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 지갑 주소 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">지갑 주소</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                  {formatWalletAddress(publicKey)}
                </code>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={copyAddress}
                  className="shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={openExplorer}
                  className="shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 잔고 표시 */}
            {showBalance && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">SOL 잔고</Label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">
                    {isLoadingBalance ? '로딩...' : formatBalance(balance)}
                  </span>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={fetchBalance}
                    disabled={isLoadingBalance}
                    className="shrink-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            {showActions && (
              <div className="flex gap-2">
                <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="neutral" size="sm" className="flex-1">
                      <Send className="h-3 w-3 mr-1" />
                      SOL 전송
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>SOL 전송</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipient">받는 주소</Label>
                        <Input
                          id="recipient"
                          placeholder="받는 사람의 Solana 주소"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">전송 금액 (SOL)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.0001"
                          placeholder="전송할 SOL 금액"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="neutral"
                          onClick={() => setSendDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleSendSol}
                          disabled={isSending || !recipient || !amount}
                        >
                          {isSending ? '전송 중...' : '전송'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="neutral" 
                  size="sm"
                  onClick={disconnect}
                  disabled={isDisconnecting}
                  className="flex-1"
                >
                  {isDisconnecting ? '연결 해제 중...' : '연결 해제'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 간단한 지갑 버튼 컴포넌트
export function WalletButton({ className = '' }: { className?: string }) {
  const { isConnected, publicKey, walletName } = useWalletAdapter();

  if (!isConnected || !publicKey) {
    return (
      <Button variant="neutral" className={className}>
        <Wallet className="h-4 w-4 mr-2" />
        지갑 연결
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="neutral" className="text-xs">
        {walletName} ({formatWalletAddress(publicKey)})
      </Badge>
    </div>
  );
} 