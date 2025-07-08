import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import type { Socket } from 'socket.io';

const app = express();
const server = createServer(app);

// CORS 및 JSON 파싱 설정
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ozeooonqxrjvdoajgvnz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZW9vb25xeHJqdmRvYWpndm56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc0OTUyNiwiZXhwIjoyMDY0MzI1NTI2fQ.FHrUT_yvvWAgyO8RU3ucaAdWIHfPpD9gwypeF8dcLb0'
);

// 채팅방 목록 조회
app.get('/api/chatrooms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, chatrooms: data || [] });
  } catch {
    res.status(500).json({ success: false, error: '채팅방 목록을 가져올 수 없습니다' });
  }
});

// 메시지 조회
app.get('/api/chatrooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = ((page as number) - 1) * (limit as number);

    const { data, error } = await supabase
      .from('message_cache')
      .select('*')
      .eq('token_address', roomId)
      .order('block_time', { ascending: false })
      .range(offset, offset + (limit as number) - 1);

    if (error) throw error;

    res.json({ success: true, messages: data || [] });
  } catch {
    res.status(500).json({ success: false, error: '메시지를 가져올 수 없습니다' });
  }
});

// 메시지 전송
app.post('/api/chatrooms/:roomId/send', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message, senderWallet, signature, messageType, quantity, price } = req.body;

    const messageData = {
      token_address: roomId,
      sender_wallet: senderWallet,
      content: message,
      signature: signature,
      message_type: messageType || 'CHAT',
      quantity: quantity || null,
      price: price || null,
      block_time: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('message_cache')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    // Socket.IO로 실시간 브로드캐스트
    io.to(`room:${roomId}`).emit('new_message', data);

    res.json({ success: true, message: data });
  } catch {
    res.status(500).json({ success: false, error: '메시지 전송에 실패했습니다' });
  }
});

// Socket.IO 설정
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket: Socket) => {
  // 채팅방 참가
  socket.on('join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);
  });

  // 채팅방 나가기
  socket.on('leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    // 연결 해제 처리
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  // 서버 시작 로그 제거됨
});

export { io }; 