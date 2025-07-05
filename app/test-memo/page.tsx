'use client';

import { useState } from 'react';
import { useMemo } from '@/hooks/useMemo';
import { SUPPORTED_PROTOCOLS, SupportedProtocol, MessageType } from '@/lib/memo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, MessageSquare, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import WalletAdapter from '@/components/WalletAdapter';

export default function TestMemoPage() {
  const {
    isSending,
    lastTransaction,
    error,
    sendChatMessage,
    sendBuyMessage,
    sendSellMessage,
    parseMessage,
    validateMessage,
    formatMessage,
    isReady,
    clearError,
  } = useMemo();

  // 상태 관리
  const [chatMessage, setChatMessage] = useState('안녕하세요! TradeChat에서 첫 메시지입니다 🚀');
  const [messageType, setMessageType] = useState<MessageType>('BUY');
  const [tokenSymbol, setTokenSymbol] = useState('SOL');
  const [quantity, setQuantity] = useState('100');
  const [price, setPrice] = useState('1.5');
  const [protocol, setProtocol] = useState<SupportedProtocol>('RAYDIUM');
  const [parseText, setParseText] = useState('BUY:SOL:100@1.5:RAYDIUM');
  const [validationText, setValidationText] = useState('BUY:SOL:100@1.5:RAYDIUM');

  // 채팅 메시지 전송
  const handleSendChatMessage = async () => {
    try {
      await sendChatMessage(chatMessage);
      setChatMessage('');
    } catch (err) {
      console.error('채팅 메시지 전송 실패:', err);
    }
  };

  // 거래 메시지 전송
  const handleSendTradeMessage = async () => {
    try {
      const qty = parseFloat(quantity);
      const prc = parseFloat(price);

      if (messageType === 'BUY') {
        await sendBuyMessage(tokenSymbol, qty, prc, protocol);
      } else {
        await sendSellMessage(tokenSymbol, qty, prc, protocol);
      }
    } catch (err) {
      console.error('거래 메시지 전송 실패:', err);
    }
  };

  // 메시지 파싱 테스트
  const parsedMessage = parseMessage(parseText);

  // 메시지 유효성 검증 테스트
  const validationResult = validateMessage(validationText);

  // 메시지 포맷 생성 테스트
  const formattedMessage = formatMessage(
    messageType,
    '',
    tokenSymbol,
    parseFloat(quantity) || undefined,
    parseFloat(price) || undefined,
    protocol
  );

  // 주소 복사
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('복사되었습니다!');
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // Solana Explorer 열기
  const openExplorer = (signature: string) => {
    window.open(`https://solscan.io/tx/${signature}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Memo Program 테스트
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solana Memo Program을 사용한 메시지 전송 시스템 종합 테스트
          </p>
        </div>

        {/* 지갑 연결 */}
        <Card>
          <CardHeader>
            <CardTitle>지갑 연결</CardTitle>
            <CardDescription>
              메모 트랜잭션을 전송하려면 먼저 지갑을 연결해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletAdapter />
          </CardContent>
        </Card>

        {/* 에러 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="neutral" size="sm" onClick={clearError}>
                확인
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 마지막 트랜잭션 결과 */}
        {lastTransaction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">성공</Badge>
                마지막 트랜잭션
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">트랜잭션 서명</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    {lastTransaction.signature}
                  </code>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => copyToClipboard(lastTransaction.signature)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => openExplorer(lastTransaction.signature)}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">메시지</Label>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  {lastTransaction.message}
                </p>
              </div>
              {lastTransaction.protocol && (
                <div>
                  <Label className="text-sm font-medium">프로토콜</Label>
                  <Badge variant="neutral" className="ml-2">
                    {SUPPORTED_PROTOCOLS[lastTransaction.protocol]}
                  </Badge>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">시간</Label>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {lastTransaction.timestamp.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 채팅 메시지 전송 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                채팅 메시지 전송
              </CardTitle>
              <CardDescription>
                일반 텍스트 메시지를 온체인에 기록합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chat-message">메시지</Label>
                <Textarea
                  id="chat-message"
                  placeholder="전송할 메시지를 입력하세요"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSendChatMessage}
                disabled={!isReady || isSending || !chatMessage.trim()}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    채팅 메시지 전송
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 거래 메시지 전송 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {messageType === 'BUY' ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                거래 메시지 전송
              </CardTitle>
              <CardDescription>
                매수/매도 의향을 구조화된 형태로 전송합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>거래 유형</Label>
                  <Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">매수 (BUY)</SelectItem>
                      <SelectItem value="SELL">매도 (SELL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-symbol">토큰</Label>
                  <Input
                    id="token-symbol"
                    placeholder="SOL"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    placeholder="100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">가격</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.001"
                    placeholder="1.5"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>프로토콜</Label>
                <Select value={protocol} onValueChange={(value) => setProtocol(value as SupportedProtocol)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_PROTOCOLS).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>생성될 메시지</Label>
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                  {formattedMessage}
                </code>
              </div>

              <Button
                onClick={handleSendTradeMessage}
                disabled={!isReady || isSending || !tokenSymbol || !quantity || !price}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    {messageType === 'BUY' ? (
                      <TrendingUp className="h-4 w-4 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-2" />
                    )}
                    {messageType === 'BUY' ? '매수' : '매도'} 메시지 전송
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 유틸리티 테스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메시지 파싱 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle>메시지 파싱</CardTitle>
              <CardDescription>
                메모 문자열을 구조화된 데이터로 변환
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parse-text">메모 텍스트</Label>
                <Input
                  id="parse-text"
                  placeholder="BUY:SOL:100@1.5:RAYDIUM"
                  value={parseText}
                  onChange={(e) => setParseText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>파싱 결과</Label>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm space-y-1">
                  <div><strong>타입:</strong> {parsedMessage.type}</div>
                  <div><strong>토큰:</strong> {parsedMessage.tokenSymbol || 'N/A'}</div>
                  <div><strong>수량:</strong> {parsedMessage.quantity || 'N/A'}</div>
                  <div><strong>가격:</strong> {parsedMessage.price || 'N/A'}</div>
                  <div><strong>프로토콜:</strong> {parsedMessage.protocol ? SUPPORTED_PROTOCOLS[parsedMessage.protocol] : 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 메시지 유효성 검증 */}
          <Card>
            <CardHeader>
              <CardTitle>유효성 검증</CardTitle>
              <CardDescription>
                메시지 형식의 유효성을 검증
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="validation-text">검증할 메시지</Label>
                <Input
                  id="validation-text"
                  placeholder="BUY:SOL:100@1.5:RAYDIUM"
                  value={validationText}
                  onChange={(e) => setValidationText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>검증 결과</Label>
                <div className="space-y-2">
                  <Badge variant={validationResult.isValid ? "default" : "neutral"}>
                    {validationResult.isValid ? '유효함' : '유효하지 않음'}
                  </Badge>
                  {!validationResult.isValid && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                      <strong>오류:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 지원 프로토콜 */}
          <Card>
            <CardHeader>
              <CardTitle>지원 프로토콜</CardTitle>
              <CardDescription>
                현재 지원하는 11개 거래 프로토콜
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500">Token Launch Platforms</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['PUMP', 'LAUNCHLAB', 'LAUNCH_A_COIN', 'BOOP', 'MOONSHOT'].map(protocol => (
                      <Badge key={protocol} variant="neutral" className="text-xs">
                        {SUPPORTED_PROTOCOLS[protocol as SupportedProtocol]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">AMM Protocols</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['RAYDIUM', 'PUMP_AMM', 'METEORA_AMM', 'METEORA_AMM_V2'].map(protocol => (
                      <Badge key={protocol} variant="neutral" className="text-xs">
                        {SUPPORTED_PROTOCOLS[protocol as SupportedProtocol]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">DeFi Protocols</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['BONK', 'DYNAMIC_BC'].map(protocol => (
                      <Badge key={protocol} variant="neutral" className="text-xs">
                        {SUPPORTED_PROTOCOLS[protocol as SupportedProtocol]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 