'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/types';
import { getStableConnection } from '@/lib/solana';
import { extractMemoFromTransaction, parseMemoMessage } from '@/lib/memo';
import { useWallet } from '@solana/wallet-adapter-react';

const DEFAULT_AVATARS = [
  '🦊', '🐸', '🐱', '🐶', '🦁', '🐯', '🐨', '🐼'
];

// 글로벌 메시지 스토어 (실제로는 상태 관리 라이브러리나 WebSocket을 사용)
let globalMessages: ChatMessage[] = [];

// 🎯 내가 생성한 트랜잭션 시그니처 추적
const myTransactionSignatures = new Set<string>();

// 클라이언트에서만 초기 메시지 로드
if (typeof window !== 'undefined') {
  globalMessages = [
    {
      id: '1',
      roomId: 'sol-usdc',
      userId: 'user1',
      userAddress: '0xabc...def',
      avatar: '',
      tradeType: 'buy',
      tradeAmount: '2.3 SOL',
      content: 'Going long here 🚀',
      timestamp: new Date(),
    },
    {
      id: '2', 
      roomId: 'sol-usdc',
      userId: 'user2',
      userAddress: '0xdef...abc',
      avatar: '',
      tradeType: 'sell',
      tradeAmount: '30%',
      content: 'Taking profit, gl all',
      timestamp: new Date(),
    },
  ];
}

let messageIdCounter = 3;
const messageListeners = new Set<() => void>();

// 🔄 추가된 트랜잭션 추적을 위한 Set
const processedTxHashes = new Set<string>();

// 🎯 대기 중인 트랜잭션들 (재시도용)
const pendingTransactions = new Map<string, { signature: string; retryCount: number; roomId: string; }>(); 

// 🎯 트랜잭션 시그니처 추가 함수 (useSwap에서 호출)
export const addMyTransactionSignature = (signature: string) => {
  myTransactionSignatures.add(signature);
  console.log(`📝 내 트랜잭션 시그니처 추가: ${signature.slice(0, 8)}...`);
};

// 🎯 즉시 임시 메시지 추가 (UX 개선)
export const addTemporaryMessage = (signature: string, roomId: string = 'sol-usdc', userAddress: string, memoContent?: string) => {
  const tempMessage: ChatMessage = {
    id: `temp-${signature}`, // 임시 ID
    roomId,
    userId: 'user1',
    userAddress,
    avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    tradeType: 'buy', // 기본값
    tradeAmount: '',
    content: memoContent || '🔄 트랜잭션 처리 중...',
    timestamp: new Date(),
    txHash: signature,
  };

  // 임시 메시지 추가
  globalMessages = [...globalMessages, tempMessage]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // 모든 리스너에게 업데이트 알림
  messageListeners.forEach(listener => listener());
  
  console.log(`⚡ 임시 메시지 즉시 추가: ${signature.slice(0, 8)}...`);
  
  // 백그라운드에서 실제 메모 확인 시작
  setTimeout(() => processTransactionMemo(signature, roomId), 1000); // 1초 후 확인
};

// 🎯 트랜잭션에서 메모 확인 및 임시 메시지 교체
const processTransactionMemo = async (signature: string, roomId: string, retryCount: number = 0) => {
  const maxRetries = 5;
  const retryDelay = [2000, 3000, 5000, 8000, 10000]; // 점진적 지연

  try {
    console.log(`📡 메모 확인 시도 ${retryCount + 1}/${maxRetries}: ${signature.slice(0, 8)}...`);
    
    const connection = await getStableConnection();
    const memoText = await extractMemoFromTransaction(connection, signature);
    
    if (memoText) {
      // 메모 발견 - 임시 메시지를 실제 메시지로 교체
      const parsedMemo = parseMemoMessage(memoText);
      
      // 트랜잭션 정보 가져오기
      const txInfo = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (txInfo) {
        const senderAddress = txInfo.transaction.message.staticAccountKeys[0]?.toString() || 'Unknown';
        
        // 실제 메시지 생성
        const realMessage: ChatMessage = {
          id: signature, // 실제 시그니처로 ID 변경
          roomId,
          userId: 'user1',
          userAddress: senderAddress,
          avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
          tradeType: parsedMemo.type === 'BUY' ? 'buy' : parsedMemo.type === 'SELL' ? 'sell' : 'buy',
          tradeAmount: parsedMemo.quantity && parsedMemo.tokenSymbol 
            ? `${parsedMemo.quantity} ${parsedMemo.tokenSymbol}` 
            : '',
          content: parsedMemo.content,
          timestamp: new Date(txInfo.blockTime ? txInfo.blockTime * 1000 : Date.now()),
          txHash: signature,
        };

        // 임시 메시지 제거하고 실제 메시지 추가
        globalMessages = globalMessages
          .filter(msg => msg.id !== `temp-${signature}`) // 임시 메시지 제거
          .filter(msg => msg.id !== signature); // 중복 방지
          
        globalMessages = [...globalMessages, realMessage]
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // 처리된 트랜잭션으로 마킹
        processedTxHashes.add(signature);
        pendingTransactions.delete(signature);
        
        // 모든 리스너에게 업데이트 알림
        messageListeners.forEach(listener => listener());
        
        console.log(`✅ 실제 메모로 교체 완료: "${parsedMemo.content}"`);
        return;
      }
    }
    
    // 메모를 찾지 못한 경우 재시도
    if (retryCount < maxRetries - 1) {
      console.log(`⏳ 메모를 찾지 못함, ${retryDelay[retryCount]}ms 후 재시도...`);
      setTimeout(() => processTransactionMemo(signature, roomId, retryCount + 1), retryDelay[retryCount]);
    } else {
      // 최대 재시도 후에도 실패 - 임시 메시지를 "전송 완료"로 업데이트
      console.log(`⚠️ 최대 재시도 후에도 메모를 찾지 못함: ${signature.slice(0, 8)}...`);
      
      const tempMessageIndex = globalMessages.findIndex(msg => msg.id === `temp-${signature}`);
      if (tempMessageIndex !== -1) {
        globalMessages[tempMessageIndex].content = '✅ 트랜잭션 완료 (메모 로딩 실패)';
        messageListeners.forEach(listener => listener());
      }
      
      pendingTransactions.delete(signature);
    }
    
  } catch (error) {
    console.error(`❌ 메모 처리 실패 (시도 ${retryCount + 1}):`, error);
    
    // 재시도
    if (retryCount < maxRetries - 1) {
      setTimeout(() => processTransactionMemo(signature, roomId, retryCount + 1), retryDelay[retryCount]);
    } else {
      pendingTransactions.delete(signature);
    }
  }
};

// 새 메시지 추가 함수 (로컬 전용)
export const addMessage = (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => {
  const newMessage: ChatMessage = {
    ...message,
    id: String(messageIdCounter++),
    timestamp: new Date(),
    roomId,
  };
  
  globalMessages = [...globalMessages, newMessage];
  
  // 모든 리스너에게 업데이트 알림
  messageListeners.forEach(listener => listener());
};

// 🎯 트랜잭션 해시로 메모 수집 및 추가
export const addMemoFromTransaction = async (signature: string, roomId: string = 'sol-usdc') => {
  // 새로운 즉시 임시 메시지 추가 방식 사용
  addTemporaryMessage(signature, roomId, 'Unknown');
};

// 🚀 signature 기반 실시간 memo 추출 및 채팅 추가 (단순화된 버전)
export const addMemoFromSignature = async (signature: string) => {
  // 사용하지 않음 - useSwap에서 직접 처리
  console.log(`🔍 addMemoFromSignature 호출됨 (deprecated): ${signature.slice(0, 8)}...`);
};

// 🔄 블록체인에서 메모 확인 - 사용하지 않음
// const confirmMemoFromBlockchain = async (signature: string, roomId: string) => {

// 리스너 알림 - 사용하지 않음
// const notifyListeners = () => {
//   messageListeners.forEach(listener => listener());
// };

// 메시지 리스트 가져오기
export const getMessages = () => globalMessages;

// 특정 채팅방 메시지 가져오기
export const getRoomMessages = (roomId: string) => 
  globalMessages.filter(msg => msg.roomId === roomId);

export const useChatMessages = (roomId?: string) => {
  // 초기 상태를 빈 배열로 설정하여 hydration mismatch 방지
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { publicKey, connected } = useWallet();

  const updateMessages = useCallback(() => {
    if (!isClient) return;
    const newMessages = roomId ? getRoomMessages(roomId) : getMessages();
    setMessages(newMessages);
  }, [roomId, isClient]);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !connected || !publicKey) {
      console.log('⏸️ 메모 시스템 중단: 지갑 연결 필요');
      return;
    }

    const walletAddress = publicKey.toString();
    console.log(`🚀 내 지갑 메모 시스템 준비: ${walletAddress.slice(0, 8)}...`);

    // 초기 메시지 로드
    updateMessages();

    // 리스너 등록
    messageListeners.add(updateMessages);

    // 🚫 자동 폴링 비활성화 - 트랜잭션 생성 시 즉시 임시 메시지 표시
    console.log('✅ 즉시 메시지 표시 시스템 활성화 (백그라운드 메모 확인)');

    // 정리
    return () => {
      messageListeners.delete(updateMessages);
    };
  }, [updateMessages, isClient, connected, publicKey]);

  // 🎯 수동 메모 확인 함수 (호환성 유지)
  const checkMyTransactions = useCallback(async () => {
    console.log('📝 새로운 즉시 메시지 시스템이 활성화되어 있습니다.');
  }, []);

  // 메시지 전송 함수 (로컬 전용 - 즉시 UI 업데이트)
  const sendMessage = useCallback((content: string, tradeType: 'buy' | 'sell' = 'buy', amount: string = '') => {
    if (!roomId || !isClient) return;

    // 실제로는 여기서 API 호출
    addMessage(roomId, {
      userId: 'user1', // 임시 사용자 ID
      userAddress: publicKey?.toString() || '0x123...abc', // 연결된 지갑 주소 사용
      avatar: '',
      tradeType,
      tradeAmount: amount,
      content,
    });
  }, [roomId, isClient, publicKey]);

  return {
    messages,
    sendMessage,
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>) => 
      roomId && isClient ? addMessage(roomId, message) : null,
    // 🆕 트랜잭션에서 메모 수집 함수 export
    addMemoFromTransaction: (signature: string) => 
      roomId && isClient ? addMemoFromTransaction(signature, roomId) : null,
    // 🆕 수동 메모 확인 함수 export (호환성)
    checkMyTransactions,
  };
}; 