import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const server = createServer(app);

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
    process: process.pid
  });
});

// 서버 시작
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`✅ Supabase-based server running on port ${PORT}`);
});

// 우아한 종료
process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

export { server };