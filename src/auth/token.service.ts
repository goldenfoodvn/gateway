import RedisManager from '../config/redis.js';
import type { RefreshTokenData } from '../types/auth.types.js';
import logger from '../utils/logger.js';

export class TokenService {
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly REFRESH_TOKEN_PREFIX = 'token:refresh:';
  private readonly SESSION_PREFIX = 'session:';

  /**
   * Store refresh token in Redis
   */
  async storeRefreshToken(
    refreshToken: string,
    data: RefreshTokenData,
    ttl: number
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    await RedisManager.set(key, JSON.stringify(data), ttl);
    logger.info('Refresh token stored', {
      userId: data.userId,
      sessionId: data.sessionId
    });
  }

  /**
   * Get refresh token data from Redis
   */
  async getRefreshToken(refreshToken: string): Promise<RefreshTokenData | null> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const data = await RedisManager.get(key);

    if (!data) return null;

    return JSON.parse(data) as RefreshTokenData;
  }

  /**
   * Delete refresh token (used on logout or token rotation)
   */
  async deleteRefreshToken(refreshToken: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    await RedisManager.del(key);
    logger.info('Refresh token deleted');
  }

  /**
   * Blacklist access token (for logout)
   */
  async blacklistToken(token: string, ttl: number): Promise<void> {
    const key = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    await RedisManager.set(key, '1', ttl);
    logger.info('Token blacklisted');
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    return await RedisManager.exists(key);
  }

  /**
   * Store session data
   */
  async storeSession(sessionId: string, data: any, ttl: number): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await RedisManager.set(key, JSON.stringify(data), ttl);
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await RedisManager.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await RedisManager.del(key);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const client = RedisManager.getClient();
    const pattern = `${this.SESSION_PREFIX}*`;
    const sessions: any[] = [];
    
    // Use SCAN instead of KEYS to avoid blocking Redis
    let cursor = 0;
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = result.cursor;
      
      for (const key of result.keys) {
        const data = await RedisManager.get(key);
        if (data) {
          const session = JSON.parse(data);
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      }
    } while (cursor !== 0);

    return sessions;
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    for (const session of sessions) {
      await this.deleteSession(session.sessionId);
    }
    logger.info('All user sessions deleted', { userId });
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      const ttl = await RedisManager.ttl(`${this.SESSION_PREFIX}${sessionId}`);
      if (ttl > 0) {
        await this.storeSession(sessionId, session, ttl);
      }
    }
  }
}

export default new TokenService();
