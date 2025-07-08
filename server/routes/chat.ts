import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { io } from '../index';
import { CreateMessageRequest, ChatMessage, ChatRoom } from '../types/database';

const router = Router();

// 채팅방 목록 조회
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        name,
        description,
        image,
        token_address,
        created_by,
        member_count,
        is_active,
        created_at,
        updated_at,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'created_at', m.created_at,
            'user_address', m.user_address,
            'trade_type', m.trade_type
          )
          FROM chat_messages m
          WHERE m.room_id = chat_rooms.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message
      FROM chat_rooms 
      WHERE is_active = true 
      ORDER BY updated_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, error: '채팅방 목록을 가져올 수 없습니다' });
  }
});

// 특정 채팅방 메시지 조회
router.get('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // roomId가 string이면 UUID로 변환
    let actualRoomId = roomId;
    if (roomId === 'sol-usdc' || roomId === 'btc-chat' || roomId === 'general') {
      const uuidResult = await db.query('SELECT get_room_uuid($1) as uuid', [roomId]);
      actualRoomId = uuidResult.rows[0]?.uuid;
    }

    const offset = (Number(page) - 1) * Number(limit);
    
    const result = await db.query(`
      SELECT 
        id,
        room_id,
        user_id,
        user_address,
        nickname,
        avatar,
        content,
        trade_type,
        trade_amount,
        tx_hash,
        created_at
      FROM chat_messages 
      WHERE room_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `, [actualRoomId, limit, offset]);
    
    // 최신 순으로 다시 정렬
    const messages = result.rows.reverse();
    
    res.json({ success: true, data: messages });
  } catch {
    res.status(500).json({ success: false, error: '메시지를 가져올 수 없습니다' });
  }
});

// 메시지 전송
router.post('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const messageData: CreateMessageRequest = req.body;
    
    // roomId가 string이면 UUID로 변환
    let actualRoomId = roomId;
    if (roomId === 'sol-usdc' || roomId === 'btc-chat' || roomId === 'general') {
      const uuidResult = await db.query('SELECT get_room_uuid($1) as uuid', [roomId]);
      actualRoomId = uuidResult.rows[0]?.uuid;
    }

    // 사용자 ID 생성 (임시)
    const userId = messageData.user_address.slice(0, 8);
    
    const result = await db.query(`
      INSERT INTO chat_messages (
        room_id, user_id, user_address, nickname, avatar,
        content, trade_type, trade_amount, tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      actualRoomId,
      userId,
      messageData.user_address,
      messageData.nickname,
      messageData.avatar,
      messageData.content,
      messageData.trade_type,
      messageData.trade_amount,
      messageData.tx_hash
    ]);

    const newMessage = result.rows[0];

    // Socket.IO로 실시간 브로드캐스트
    io.to(`room:${roomId}`).emit('new_message', {
      ...newMessage,
      roomId: roomId, // 원래 roomId로 전송
      timestamp: newMessage.created_at
    });

    res.json({ success: true, data: newMessage });
  } catch {
    res.status(500).json({ success: false, error: '메시지 전송에 실패했습니다' });
  }
});

// 채팅방 생성
router.post('/rooms', async (req: Request, res: Response) => {
  try {
    const { name, description, image = '🎯', token_address, created_by } = req.body;
    
    const result = await db.query(`
      INSERT INTO chat_rooms (name, description, image, token_address, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, image, token_address, created_by]);

    const newRoom = result.rows[0];
    
    // 새 채팅방 생성 알림
    io.emit('new_room', newRoom);

    res.json({ success: true, data: newRoom });
  } catch {
    res.status(500).json({ success: false, error: '채팅방 생성에 실패했습니다' });
  }
});

export default router; 