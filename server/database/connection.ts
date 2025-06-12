// 서버 전용 파일 - 클라이언트에서 import하지 말 것
import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

// 서버 환경에서만 실행되도록 보장
if (typeof window !== 'undefined') {
  throw new Error('Database connection should only be used on the server side');
}

dotenv.config();

class DatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chat_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 연결 테스트
    this.testConnection();
  }

  private async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL 연결 성공');
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL 연결 실패:', error);
    }
  }

  async query(text: string, params?: unknown[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('🔍 SQL 실행:', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('❌ SQL 실행 오류:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseConnection(); 