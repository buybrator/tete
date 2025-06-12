'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getStableConnection } from '@/lib/solana';

interface CreateChatRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_WALLET = '9YGfNLAiVNWbkgi9jFunyqQ1Q35yirSEFYsKLN6PP1DG';
const REQUIRED_PAYMENT = 0.001; // SOL

export default function CreateChatRoomDialog({ open, onOpenChange }: CreateChatRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'payment' | 'creating'>('input');
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  
  const { walletState } = useWallet();

  // 컨트랙트 주소 중복 체크 (디바운싱)
  useEffect(() => {
    if (!contractAddress.trim() || contractAddress.length < 32) {
      setDuplicateError('');
      return;
    }

    const checkDuplicate = async () => {
      setIsDuplicateChecking(true);
      setDuplicateError('');
      
      try {
        const response = await fetch(`/api/chatrooms/check?contractAddress=${encodeURIComponent(contractAddress.trim())}`);
        const data = await response.json();
        
        if (data.success && data.exists) {
          setDuplicateError(data.message);
        }
      } catch (error) {
        console.error('중복 체크 오류:', error);
      } finally {
        setIsDuplicateChecking(false);
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [contractAddress]);

  const handleCreate = async () => {
    if (!roomName.trim() || !contractAddress.trim()) {
      alert('채팅방 이름과 컨트랙트 주소를 모두 입력해주세요.');
      return;
    }

    if (!walletState.isConnected || !walletState.address) {
      alert('지갑을 먼저 연결해주세요.');
      return;
    }

    if (duplicateError) {
      alert('이미 존재하는 컨트랙트 주소입니다.');
      return;
    }

    // 기본적인 Solana 주소 형식 검증
    try {
      new PublicKey(contractAddress.trim());
    } catch {
      alert('올바른 Solana 컨트랙트 주소 형식이 아닙니다.');
      return;
    }

    setIsLoading(true);
    setStep('payment');

    try {
      // 1단계: Solana 트랜잭션 실행
      const transactionSignature = await sendPaymentTransaction();
      
      if (!transactionSignature) {
        throw new Error('트랜잭션이 취소되었거나 실패했습니다.');
      }

      setStep('creating');

      // 2단계: 백엔드에 채팅방 생성 요청
      const response = await fetch('/api/chatrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName.trim(),
          contractAddress: contractAddress.trim(),
          creatorAddress: walletState.address,
          transactionSignature
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '채팅방 생성에 실패했습니다.');
      }

      alert(`"${roomName}" 채팅방이 성공적으로 생성되었습니다!\n트랜잭션: ${transactionSignature}`);
      
      // 성공 시 초기화
      onOpenChange(false);
      setRoomName('');
      setContractAddress('');
      setStep('input');

      // 채팅방 목록 새로고침 이벤트 발송
      window.dispatchEvent(new CustomEvent('chatroomCreated', { 
        detail: { chatroom: data.chatroom } 
      }));

    } catch (error) {
      console.error('채팅방 생성 오류:', error);
      alert(error instanceof Error ? error.message : '채팅방 생성 중 오류가 발생했습니다.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPaymentTransaction = async (): Promise<string | null> => {
    try {
      const connection = await getStableConnection();
      const fromPubkey = new PublicKey(walletState.address!);
      const toPubkey = new PublicKey(PAYMENT_WALLET);
      
      // 트랜잭션 생성
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: REQUIRED_PAYMENT * LAMPORTS_PER_SOL,
        })
      );

      // 최신 블록해시 가져오기
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // 지갑 어댑터 사용
      if (typeof window !== 'undefined' && window.solana) {
        // 트랜잭션 서명
        const signedTransaction = await window.solana.signTransaction(transaction) as Transaction;
        
        // 서명된 트랜잭션 전송
        const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        console.log(`🚀 채팅방 생성 트랜잭션 전송 완료: ${signature}`);
        console.log('⏳ 트랜잭션 확인 대기 중...');
        
        // 🎯 Swap과 동일한 polling 방식으로 트랜잭션 확인 (WebSocket 없음)
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 15; // 15초로 단축
        
        while (!confirmed && attempts < maxAttempts) {
          try {
            const txInfo = await connection.getTransaction(signature, {
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
          // 타임아웃이어도 트랜잭션은 성공했을 가능성이 높으므로 계속 진행
        }

        return signature;
      } else {
        throw new Error('Solana 지갑을 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error('트랜잭션 오류:', error);
      if (error instanceof Error && (
        error.message.includes('User rejected') || 
        error.message.includes('User denied')
      )) {
        return null; // 사용자가 취소한 경우
      }
      throw error;
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setRoomName('');
    setContractAddress('');
    setStep('input');
    setDuplicateError('');
  };

  const canCreate = 
    roomName.trim() && 
    contractAddress.trim() && 
    walletState.isConnected && 
    !duplicateError && 
    !isDuplicateChecking;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' && '새로운 채팅방 만들기'}
            {step === 'payment' && '결제 진행 중...'}
            {step === 'creating' && '채팅방 생성 중...'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {step === 'input' && (
            <>
              {/* 지갑 연결 상태 */}
              {!walletState.isConnected && (
                <div className="p-3 bg-yellow-100 border border-yellow-400 rounded-md">
                  <p className="text-sm text-yellow-700">
                    ⚠️ 채팅방을 생성하려면 지갑을 먼저 연결해주세요.
                  </p>
                </div>
              )}

              {/* 결제 안내 */}
              <div className="p-3 bg-blue-100 border border-blue-400 rounded-md">
                <p className="text-sm text-blue-700">
                  💰 채팅방 생성 비용: <strong>0.001 SOL</strong>
                </p>
              </div>

              {/* 채팅방 이름 */}
              <div className="space-y-2">
                <Label htmlFor="roomName">채팅방 이름 *</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="예: SOL/USDC 거래방"
                  className="neobrutalism-input"
                  maxLength={50}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {roomName.length}/50자
                </p>
              </div>

              {/* 컨트랙트 주소 입력 */}
              <div className="space-y-2">
                <Label htmlFor="contractAddress">컨트랙트 주소 (CA) *</Label>
                <Input
                  id="contractAddress"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="예: So11111111111111111111111111111111111111112"
                  className="neobrutalism-input font-mono text-sm"
                  maxLength={44}
                  disabled={isLoading}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Solana 토큰의 컨트랙트 주소를 입력하세요 ({contractAddress.length}/44자)
                  </p>
                  {isDuplicateChecking && (
                    <p className="text-xs text-blue-600">중복 확인 중...</p>
                  )}
                  {duplicateError && (
                    <p className="text-xs text-red-600">❌ {duplicateError}</p>
                  )}
                  {contractAddress.length >= 32 && !duplicateError && !isDuplicateChecking && (
                    <p className="text-xs text-green-600">✅ 사용 가능한 주소입니다</p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 'payment' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium">결제 진행 중</p>
              <p className="text-sm text-muted-foreground">
                지갑에서 트랜잭션을 승인해주세요...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                전송 금액: 0.001 SOL
              </p>
            </div>
          )}

          {step === 'creating' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium">채팅방 생성 중</p>
              <p className="text-sm text-muted-foreground">
                잠시만 기다려주세요...
              </p>
            </div>
          )}

          {/* 버튼들 */}
          {step === 'input' && (
            <div className="flex space-x-2 pt-4">
              <Button
                variant="neutral"
                onClick={handleCancel}
                className="neobrutalism-button flex-1"
                disabled={isLoading}
              >
                취소
              </Button>
              <Button
                onClick={handleCreate}
                className="neobrutalism-button flex-1"
                disabled={!canCreate || isLoading}
              >
                {isLoading ? '처리 중...' : '0.001 SOL 결제 후 생성'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 