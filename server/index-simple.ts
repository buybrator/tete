import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 메모리 기반 임시 저장소
let messages: any[] = [];
let messageId = 1;

// 미들웨어
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// 채팅방 목록 조회 (Mock)
app.get('/api/chat/rooms', (req, res) => {
  console.log('📋 채팅방 목록 조회');
  res.json({
    success: true,
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'SOL/USDC',
        description: 'Solana to USDC trading room',
        image: '🚀',
        token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        created_by: 'system',
        member_count: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]
  });
});

// 메시지 조회
app.get('/api/chat/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  console.log(`📨 메시지 조회: ${roomId}`);
  
  const roomMessages = messages.filter(msg => msg.roomId === roomId);
  res.json({
    success: true,
    data: roomMessages
  });
});

// 메시지 전송 - 핵심!
app.post('/api/chat/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const messageData = req.body;
  
  console.log(`📤 메시지 전송 받음:`, {
    roomId,
    content: messageData.content.substring(0, 50) + '...',
    trade_type: messageData.trade_type,
    user_address: messageData.user_address
  });

  // 새 메시지 생성
  const newMessage = {
    id: String(messageId++),
    room_id: roomId,
    user_id: messageData.user_address.slice(0, 8),
    user_address: messageData.user_address,
    nickname: messageData.nickname,
    avatar: messageData.avatar || '🎯',
    content: messageData.content,
    trade_type: messageData.trade_type,
    trade_amount: messageData.trade_amount,
    tx_hash: messageData.tx_hash,
    created_at: new Date().toISOString()
  };

  // 메모리에 저장
  messages.push(newMessage);

  // Socket.IO로 실시간 브로드캐스트
  io.to(`room:${roomId}`).emit('new_message', {
    ...newMessage,
    roomId: roomId,
    timestamp: newMessage.created_at
  });

  console.log(`✅ 메시지 저장 & 브로드캐스트 완료`);
  res.json({ success: true, data: newMessage });
});

// 상태 확인
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), messages: messages.length });
});

// Socket.IO 핸들러
io.on('connection', (socket) => {
  console.log(`🔗 클라이언트 연결: ${socket.id}`);

  socket.on('join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);
    console.log(`👥 사용자 ${socket.id}가 방 ${roomId}에 참가`);
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
    console.log(`👋 사용자 ${socket.id}가 방 ${roomId}를 떠남`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 클라이언트 연결 해제: ${socket.id}`);
  });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`🚀 간단 백엔드 서버 실행 중: http://localhost:${PORT}`);
  console.log(`🔗 Socket.IO 연결: ws://localhost:${PORT}`);
  console.log(`📊 상태 확인: http://localhost:${PORT}/health`);
});

export { io }; 