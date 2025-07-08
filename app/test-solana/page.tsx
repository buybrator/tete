'use client';

import { useState } from 'react';
import { useSolana } from '@/hooks/useSolana';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

export default function TestSolanaPage() {
  const { 
    connection, 
    status, 
    stats, 
    currentNetwork, 
    reconnect, 
    refreshStats,
    isConnected,
    isLoading,
    hasError 
  } = useSolana();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 🔍 RPC 엔드포인트 디버깅
  const debugRpcConnection = async () => {
    setDebugInfo('🔍 RPC 연결 디버깅 시작...\n');
    
    try {
      if (!connection) {
        setDebugInfo(prev => prev + '❌ Connection 객체가 없습니다.\n');
        return;
      }

      setDebugInfo(prev => prev + `🚀 현재 RPC 엔드포인트: ${connection.rpcEndpoint}\n`);
      setDebugInfo(prev => prev + `📡 네트워크: ${currentNetwork}\n`);
      setDebugInfo(prev => prev + `🔧 Commitment: ${connection.commitment}\n`);

      // getVersion 테스트 (가장 기본적인 RPC 호출)
      setDebugInfo(prev => prev + '📊 getVersion 호출 중...\n');
      const version = await connection.getVersion();
      setDebugInfo(prev => prev + `✅ Solana Core: ${version['solana-core']}\n`);
      setDebugInfo(prev => prev + `✅ Feature Set: ${version['feature-set']}\n`);

      // getBlockHeight 테스트
      setDebugInfo(prev => prev + '🏗️ getBlockHeight 호출 중...\n');
      const blockHeight = await connection.getBlockHeight();
      setDebugInfo(prev => prev + `✅ 현재 블록 높이: ${blockHeight.toLocaleString()}\n`);

      setDebugInfo(prev => prev + '🎉 모든 테스트 통과!\n');

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDebugInfo(prev => prev + `❌ 오류 발생: ${errorMsg}\n`);
      
      if (errorMsg.includes('403') || errorMsg.includes('Access forbidden')) {
        setDebugInfo(prev => prev + '🚨 403 오류 감지! RPC 엔드포인트 문제입니다.\n');
      }
      
    }
  };

  // 🔍 개별 RPC 엔드포인트 테스트
  const testIndividualRpc = async (endpoint: string) => {
    setDebugInfo(prev => prev + `\n🧪 단독 테스트: ${endpoint}\n`);
    
    try {
      // 직접 fetch로 RPC 요청
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot'
        })
      });

      if (!response.ok) {
        setDebugInfo(prev => prev + `❌ HTTP ${response.status}: ${response.statusText}\n`);
        return;
      }

      const data = await response.json();
      if (data.error) {
        setDebugInfo(prev => prev + `❌ RPC 오류: ${JSON.stringify(data.error)}\n`);
      } else {
        setDebugInfo(prev => prev + `✅ 성공! 현재 슬롯: ${data.result}\n`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDebugInfo(prev => prev + `❌ 네트워크 오류: ${errorMsg}\n`);
    }
  };

  // 🔍 모든 RPC 엔드포인트 순차 테스트
  const testAllRpcEndpoints = async () => {
    setDebugInfo('🔍 모든 RPC 엔드포인트 순차 테스트 시작...\n\n');
    
    // 실제 코드에서 사용하는 엔드포인트와 동일하게 설정
    const endpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://api.metaplex.solana.com',
      'https://rpc.public.solana.com',
      'https://solana-mainnet.core.chainstack.com',
    ];

    for (const endpoint of endpoints) {
      await testIndividualRpc(endpoint);
      // 각 테스트 사이에 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setDebugInfo(prev => prev + '\n🏁 모든 테스트 완료!\n');
  };

  // 🔍 서버사이드 프록시 테스트
  const testServerProxy = async () => {
    setDebugInfo('🔍 서버사이드 프록시 테스트 시작...\n\n');
    
    try {
      // 1. GET 요청으로 건강성 체크
      setDebugInfo(prev => prev + '📡 프록시 건강성 체크...\n');
      const healthResponse = await fetch('/api/solana-rpc');
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok) {
        setDebugInfo(prev => prev + `✅ 프록시 상태: ${healthData.status}\n`);
        setDebugInfo(prev => prev + `🚀 현재 엔드포인트: ${healthData.currentEndpoint}\n`);
      } else {
        setDebugInfo(prev => prev + `❌ 프록시 건강성 체크 실패: ${healthData.error}\n`);
      }

      // 2. POST 요청으로 실제 RPC 호출
      setDebugInfo(prev => prev + '\n📊 getVersion 테스트...\n');
      const rpcResponse = await fetch('/api/solana-rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getVersion'
        })
      });

      const rpcData = await rpcResponse.json();
      
      if (rpcResponse.ok && !rpcData.error) {
        setDebugInfo(prev => prev + `✅ Solana Core: ${rpcData.result['solana-core']}\n`);
        setDebugInfo(prev => prev + `✅ Feature Set: ${rpcData.result['feature-set']}\n`);
      } else {
        setDebugInfo(prev => prev + `❌ RPC 호출 실패: ${JSON.stringify(rpcData.error)}\n`);
      }

      // 3. getBlockHeight 테스트
      setDebugInfo(prev => prev + '\n🏗️ getBlockHeight 테스트...\n');
      const blockResponse = await fetch('/api/solana-rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getBlockHeight'
        })
      });

      const blockData = await blockResponse.json();
      
      if (blockResponse.ok && !blockData.error) {
        setDebugInfo(prev => prev + `✅ 현재 블록 높이: ${blockData.result.toLocaleString()}\n`);
      } else {
        setDebugInfo(prev => prev + `❌ getBlockHeight 실패: ${JSON.stringify(blockData.error)}\n`);
      }

      setDebugInfo(prev => prev + '\n🎉 프록시 테스트 완료!\n');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDebugInfo(prev => prev + `❌ 프록시 테스트 오류: ${errorMsg}\n`);
    }
  };

  const handleRefreshStats = async () => {
    setIsRefreshing(true);
    try {
      await refreshStats();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Solana 연결 테스트</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solana RPC 연결 상태와 네트워크 정보를 확인합니다
          </p>
        </div>

        {/* 🔥 새로운 디버깅 섹션 */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              RPC 연결 디버깅
            </CardTitle>
            <CardDescription>
              403 오류 해결을 위한 상세 진단
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={debugRpcConnection}
                className="w-full"
                variant="neutral"
              >
                🔍 RPC 연결 진단 시작
              </Button>
              
              <Button 
                onClick={testAllRpcEndpoints}
                className="w-full"
                variant="neutral"
              >
                🧪 모든 RPC 엔드포인트 테스트
              </Button>
              
              <Button 
                onClick={testServerProxy}
                className="w-full"
                variant="neutral"
              >
                🚀 서버사이드 프록시 테스트 (최종 해결책!)
              </Button>
            </div>
            
            {debugInfo && (
              <div className="space-y-2">
                <label className="text-sm font-medium">진단 결과:</label>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm font-mono whitespace-pre-wrap overflow-auto max-h-64">
                  {debugInfo}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기존 연결 상태 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-green-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  )}
                  연결 상태
                </CardTitle>
                <CardDescription>
                  현재 Solana 네트워크 연결 상태
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                >
                  {isReconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '재연결'
                  )}
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={handleRefreshStats}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 연결 상태 */}
              <div className="flex items-center justify-between">
                <span className="font-medium">연결 상태:</span>
                <Badge variant={isConnected ? 'default' : 'neutral'}>
                  {isLoading ? '연결 중...' : isConnected ? '연결됨' : '연결 안됨'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">네트워크:</span>
                <Badge variant="neutral">
                  {status.network}
                </Badge>
              </div>

              {status.blockHeight && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">블록 높이:</span>
                  <span className="font-mono">#{status.blockHeight.toLocaleString()}</span>
                </div>
              )}

              {hasError && status.error && (
                <div className="space-y-2">
                  <span className="font-medium text-red-500">오류:</span>
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    {status.error}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 기존 연결 정보 카드에 더 자세한 정보 추가 */}
        <Card>
          <CardHeader>
            <CardTitle>연결 정보</CardTitle>
            <CardDescription>
              현재 연결 설정 및 기술적 정보
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Connection 객체:</span>
                <Badge variant="neutral">
                  {connection ? '생성됨' : '없음'}
                </Badge>
              </div>
              
              {connection && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">RPC 엔드포인트:</span>
                    <span className="font-mono text-xs text-right max-w-xs truncate">
                      {connection.rpcEndpoint}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Commitment:</span>
                    <Badge variant="neutral">
                      {connection.commitment}
                    </Badge>
                  </div>
                </>
              )}

              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  환경 변수 NEXT_PUBLIC_SOLANA_NETWORK: <code>{process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'undefined'}</code>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  현재 사용 중인 네트워크: <code>{currentNetwork}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기존 네트워크 통계 카드는 유지 */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>네트워크 통계</CardTitle>
              <CardDescription>
                실시간 Solana 네트워크 정보
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    블록체인 정보
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>블록 높이:</span>
                      <span className="font-mono">#{stats.blockHeight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>현재 에포크:</span>
                      <span className="font-mono">{stats.epochInfo.epoch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>슬롯 인덱스:</span>
                      <span className="font-mono">{stats.epochInfo.slotIndex.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    에포크 정보
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>총 슬롯:</span>
                      <span className="font-mono">{stats.epochInfo.slotsInEpoch.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>절대 슬롯:</span>
                      <span className="font-mono">{stats.epochInfo.absoluteSlot.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>진행률:</span>
                      <span>
                        {((stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    공급량 정보
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>총 공급량:</span>
                      <span className="font-mono">{stats.supply.total.toLocaleString()} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>순환 공급량:</span>
                      <span className="font-mono">{stats.supply.circulating.toLocaleString()} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>비순환 공급량:</span>
                      <span className="font-mono">{stats.supply.nonCirculating.toLocaleString()} SOL</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 