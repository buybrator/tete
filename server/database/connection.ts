// 서버 전용 파일 - 클라이언트에서 import하지 말 것
import { Pool, PoolClient, QueryResult } from 'pg';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import dotenv from 'dotenv';

// 서버 환경에서만 실행되도록 보장
if (typeof window !== 'undefined') {
  throw new Error('Database connection should only be used on the server side');
}

dotenv.config();

class DatabaseConnection {
  private pool: Pool;
  private redisClient: RedisClientType | null = null;

  constructor() {
    // 🚀 확장된 연결 풀 설정
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chat_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      // 🎯 성능 최적화 설정
      max: 50, // 20 → 50으로 확장
      min: 5, // 최소 연결 유지
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // 2초 → 5초로 확장
      
      // 📊 성능 모니터링
      statement_timeout: 30000, // 30초 쿼리 타임아웃
      query_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Redis 클라이언트 초기화 (캐싱용)
    this.setupRedisCache();
    
    // 연결 테스트
    this.testConnection();
    
    // 🔍 연결 풀 모니터링
    this.setupPoolMonitoring();
  }

  private async setupRedisCache() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });
      
      this.redisClient.on('error', (err) => {
        // Redis 클라이언트 오류 처리
      });
      
      await this.redisClient.connect();
      // Redis 캐시 연결 성공
    } catch (error) {
      // Redis 캐시 연결 실패 (계속 진행)
      this.redisClient = null;
    }
  }

  private setupPoolMonitoring() {
    // 5분마다 연결 풀 상태 로깅
    setInterval(async () => {
      try {
        const stats = {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        };
        
        if (stats.waitingCount > 0) {
          // DB 연결 대기 중
        }
        
        if (stats.totalCount > 15) {
          // DB 연결 수 높음
        }
      } catch {
        // 모니터링 오류는 무시
      }
    }, 30000); // 30초마다
  }

  private async testConnection() {
    try {
      const client = await this.pool.connect();
      // PostgreSQL 연결 성공
      client.release();
    } catch (error) {
      // PostgreSQL 연결 실패
    }
  }

  // 🚀 캐시된 쿼리 실행
  async cachedQuery(cacheKey: string, text: string, params?: unknown[], cacheTime = 300): Promise<QueryResult> {
    // Redis 캐시 확인
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          // 🎯 캐시 히트:
          return JSON.parse(cached);
        }
      } catch (error) {
        // 캐시 조회 실패:
      }
    }

    // DB에서 조회
    const result = await this.query(text, params);

    // 결과 캐싱
    if (this.redisClient && result.rowCount && result.rowCount > 0) {
      try {
        await this.redisClient.setEx(cacheKey, cacheTime, JSON.stringify(result));
        // 💾 결과 캐싱:
      } catch (error) {
        // 캐싱 실패:
      }
    }

    return result;
  }

  // 🔄 배치 INSERT/UPDATE
  async batchInsert(table: string, data: Record<string, unknown>[], conflictClause?: string): Promise<QueryResult> {
    if (data.length === 0) {
      return {
        rows: [],
        rowCount: 0,
        command: 'INSERT',
        oid: 0,
        fields: []
      } as QueryResult;
    }

    const columns = Object.keys(data[0]);
    const values = data.map((row, index) => 
      `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const params = data.flatMap(row => columns.map(col => row[col]));
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')}) 
      VALUES ${values}
      ${conflictClause || ''}
    `;

    // 🚀 배치 INSERT:
    return this.query(query, params);
  }

  async query(text: string, params?: unknown[]): Promise<QueryResult> {
    const start = Date.now();
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      
      // 느린 쿼리 경고
      if (duration > 1000) {
        // 느린 쿼리 감지
      } else {
        // 🔍 SQL 실행:
      }
      
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      // SQL 실행 오류
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // 캐시 무효화
  async invalidateCache(pattern: string) {
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          // ��️ 캐시 무효화:
        }
      } catch (error) {
        // 캐시 무효화 실패:
      }
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    await this.pool.end();
  }

  // 연결 풀 상태 조회
  getPoolStats() {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }
}

export const db = new DatabaseConnection(); 