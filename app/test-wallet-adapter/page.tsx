'use client';

import { useState } from 'react';
import { Transaction, SystemProgram } from '@solana/web3.js';
import { useWalletAdapter } from '@/hooks/useWalletAdapter';
import WalletAdapter, { WalletButton } from '@/components/WalletAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MEMO_PROGRAM_ID } from '@/lib/solana';

export default function TestWalletAdapterPage() {
  const {
    isConnected,
    publicKey,
    walletName,
    balance,
    sendTransaction,
    signMessage,
    signTransaction: signTx,
    formatAddress,
    formatBalance,
    error
  } = useWalletAdapter();

  // 테스트 상태
  const [testMessage, setTestMessage] = useState('Hello from TradeChat!');
  const [signedMessage, setSignedMessage] = useState<string>('');
  const [isTestingSign, setIsTestingSign] = useState(false);
  const [isTestingMemo, setIsTestingMemo] = useState(false);
  const [memoText, setMemoText] = useState('BUY:SOL:1@150:RAYDIUM');
  const [lastTxSignature, setLastTxSignature] = useState<string>('');

  // 메시지 서명 테스트
  const handleSignMessage = async () => {
    try {
      setIsTestingSign(true);
      const signature = await signMessage(testMessage);
      
      // Uint8Array를 hex 문자열로 변환
      const hexSignature = Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      setSignedMessage(hexSignature);
      console.log('메시지 서명 성공:', hexSignature);
    } catch (error) {
      console.error('메시지 서명 실패:', error);
      alert(`메시지 서명 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsTestingSign(false);
    }
  };

  // 메모 트랜잭션 테스트
  const handleSendMemo = async () => {
    if (!publicKey) return;

    try {
      setIsTestingMemo(true);
      
      // 메모 트랜잭션 생성
      const transaction = new Transaction().add({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoText, 'utf8'),
      });

      // 트랜잭션 전송
      const signature = await sendTransaction(transaction);
      setLastTxSignature(signature);
      
      console.log('메모 트랜잭션 성공:', signature);
      alert(`메모 트랜잭션 성공!\n서명: ${signature}`);
    } catch (error) {
      console.error('메모 트랜잭션 실패:', error);
      alert(`메모 트랜잭션 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsTestingMemo(false);
    }
  };

  // 트랜잭션 서명 테스트 (전송하지 않음)
  const handleSignTransaction = async () => {
    if (!publicKey) return;

    try {
      // 더미 트랜잭션 생성 (0.001 SOL 자신에게 전송)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000000, // 0.001 SOL
        })
      );

      const signedTx = await signTx(transaction);
      console.log('트랜잭션 서명 성공:', signedTx);
      alert('트랜잭션 서명 성공! (전송하지 않음)');
    } catch (error) {
      console.error('트랜잭션 서명 실패:', error);
      alert(`트랜잭션 서명 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Wallet Adapter 테스트
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solana Wallet Adapter 기능 종합 테스트
          </p>
        </div>

        {/* 기본 지갑 어댑터 컴포넌트 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 지갑 어댑터</CardTitle>
            <CardDescription>
              모든 기본 기능을 포함한 지갑 어댑터 컴포넌트
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletAdapter />
          </CardContent>
        </Card>

        {/* 간단한 지갑 버튼 */}
        <Card>
          <CardHeader>
            <CardTitle>간단한 지갑 버튼</CardTitle>
            <CardDescription>
              네비게이션에서 사용할 수 있는 간단한 버튼
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletButton className="w-full" />
          </CardContent>
        </Card>

        {/* 지갑 정보 표시 */}
        {isConnected && publicKey && (
          <Card>
            <CardHeader>
              <CardTitle>지갑 정보</CardTitle>
              <CardDescription>
                현재 연결된 지갑의 상세 정보
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">지갑 이름</Label>
                  <Badge variant="neutral">{walletName || 'Unknown'}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">연결 상태</Label>
                  <Badge variant="default">연결됨</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">지갑 주소</Label>
                  <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                    {publicKey.toString()}
                  </code>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">짧은 주소</Label>
                  <span className="font-mono">{formatAddress(publicKey.toString())}</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">SOL 잔고</Label>
                  <span className="font-mono text-lg">{formatBalance(balance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기능 테스트 섹션 */}
        {isConnected && (
          <>
            <hr className="border-gray-200 dark:border-gray-700 my-6" />
            
            {/* 메시지 서명 테스트 */}
            <Card>
              <CardHeader>
                <CardTitle>메시지 서명 테스트</CardTitle>
                <CardDescription>
                  지갑으로 메시지에 서명하는 기능을 테스트합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-message">서명할 메시지</Label>
                  <Input
                    id="test-message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="서명할 메시지를 입력하세요"
                  />
                </div>
                
                <Button 
                  onClick={handleSignMessage}
                  disabled={isTestingSign || !testMessage}
                  className="w-full"
                >
                  {isTestingSign ? '서명 중...' : '메시지 서명'}
                </Button>
                
                {signedMessage && (
                  <div className="space-y-2">
                    <Label>서명 결과 (Hex)</Label>
                    <code className="block p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
                      {signedMessage}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 메모 트랜잭션 테스트 */}
            <Card>
              <CardHeader>
                <CardTitle>메모 트랜잭션 테스트</CardTitle>
                <CardDescription>
                  Solana Memo Program을 사용한 온체인 메시지 기록
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memo-text">메모 내용</Label>
                  <Input
                    id="memo-text"
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    placeholder="BUY:SOL:1@150:RAYDIUM"
                  />
                </div>
                
                <Button 
                  onClick={handleSendMemo}
                  disabled={isTestingMemo || !memoText}
                  className="w-full"
                >
                  {isTestingMemo ? '전송 중...' : '메모 트랜잭션 전송'}
                </Button>
                
                {lastTxSignature && (
                  <div className="space-y-2">
                    <Label>마지막 트랜잭션 서명</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                        {lastTxSignature}
                      </code>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => window.open(`https://solscan.io/tx/${lastTxSignature}`, '_blank')}
                      >
                        Explorer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 트랜잭션 서명 테스트 */}
            <Card>
              <CardHeader>
                <CardTitle>트랜잭션 서명 테스트</CardTitle>
                <CardDescription>
                  트랜잭션에 서명만 하고 전송하지 않는 기능 테스트
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSignTransaction}
                  className="w-full"
                >
                  트랜잭션 서명 (전송하지 않음)
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* 에러 표시 */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">에러</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 