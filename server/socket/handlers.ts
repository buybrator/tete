import { Server, Socket } from 'socket.io';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔗 클라이언트 연결: ${socket.id}`);

    // 채팅방 참가
    socket.on('join_room', (roomId: string) => {
      socket.join(`room:${roomId}`);
      console.log(`👥 사용자 ${socket.id}가 방 ${roomId}에 참가했습니다`);
      
      // 참가 알림 (선택적)
      socket.to(`room:${roomId}`).emit('user_joined', {
        socketId: socket.id,
        roomId,
        timestamp: new Date()
      });
    });

    // 채팅방 나가기
    socket.on('leave_room', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      console.log(`👋 사용자 ${socket.id}가 방 ${roomId}를 떠났습니다`);
      
      // 나가기 알림 (선택적)
      socket.to(`room:${roomId}`).emit('user_left', {
        socketId: socket.id,
        roomId,
        timestamp: new Date()
      });
    });

    // 타이핑 상태 전송
    socket.on('typing_start', (data: { roomId: string; userAddress: string }) => {
      socket.to(`room:${data.roomId}`).emit('user_typing', {
        socketId: socket.id,
        userAddress: data.userAddress,
        roomId: data.roomId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data: { roomId: string; userAddress: string }) => {
      socket.to(`room:${data.roomId}`).emit('user_typing', {
        socketId: socket.id,
        userAddress: data.userAddress,
        roomId: data.roomId,
        isTyping: false
      });
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`🔌 클라이언트 연결 해제: ${socket.id}`);
    });

    // 에러 핸들링
    socket.on('error', (error) => {
      console.error(`❌ Socket 에러 (${socket.id}):`, error);
    });
  });

  // 전체 연결 상태 로깅
  setInterval(() => {
    const connectedClients = io.engine.clientsCount;
    if (connectedClients > 0) {
      console.log(`📊 현재 연결된 클라이언트: ${connectedClients}명`);
    }
  }, 30000); // 30초마다
} 