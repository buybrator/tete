import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database/connection';
import chatRoutes from './routes/chat';
import { setupSocketHandlers } from './socket/handlers';

dotenv.config();

const app = express();
const server = createServer(app);

// 🚀 Redis 클라이언트 설정 (Socket.IO 스케일링용)
const pubClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
const subClient = pubClient.duplicate();

// Socket.IO 서버 설정 with Redis Adapter
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  // 🎯 성능 최적화 설정
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true
});

// Redis Adapter 적용
async function setupRedisAdapter() {
  try {
    await pubClient.connect();
    await subClient.connect();
    
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis Adapter 연결 성공');
  } catch (error) {
    console.error('❌ Redis Adapter 연결 실패:', error);
    // Redis 없어도 기본 동작 가능
  }
}

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// API 라우트
app.use('/api/chat', chatRoutes);

// 상태 확인 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    process: process.pid,
    connections: io.engine.clientsCount
  });
});

// Socket.IO 핸들러 설정
setupSocketHandlers(io);

// 서버 시작
const PORT = process.env.PORT || 3001;

async function startServer() {
  await setupRedisAdapter();
  
  server.listen(PORT, () => {
    console.log(`🚀 서버 시작: http://localhost:${PORT} (PID: ${process.pid})`);
  });
}

startServer();

// 우아한 종료
process.on('SIGTERM', async () => {
  console.log('🛑 서버 종료 중...');
  
  try {
    await pubClient.quit();
    await subClient.quit();
    await db.close();
    server.close();
  } catch (error) {
    console.error('종료 중 오류:', error);
  }
  
  process.exit(0);
});

export { io }; 