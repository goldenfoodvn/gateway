import { v4 as uuidv4 } from 'uuid';
import type { Session, TokenPayload } from '../types/auth.types.js';
import TokenService from './token.service.js';
import logger from '../utils/logger.js';

export class SessionService {
  /**
   * Create a new session
   */
  async createSession(
    payload: Omit<TokenPayload, 'sessionId'>,
    refreshTTL: number
  ): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + refreshTTL * 1000);

    const session: Session = {
      sessionId,
      userId: payload.userId,
      deviceId: payload.deviceId || 'unknown',
      deviceName: payload.deviceName || 'Unknown Device',
      deviceType: payload.deviceType || 'web',
      ipAddress: payload.ipAddress || 'unknown',
      userAgent: payload.userAgent || 'unknown',
      createdAt: now,
      lastActivity: now,
      expiresAt
    };

    await TokenService.storeSession(sessionId, session, refreshTTL);

    logger.info('Session created', {
      userId: payload.userId,
      sessionId,
      deviceId: session.deviceId
    });

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return await TokenService.getSession(sessionId);
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    await TokenService.updateSessionActivity(sessionId);
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(sessionId: string): Promise<void> {
    await TokenService.deleteSession(sessionId);
    logger.info('Session deleted', { sessionId });
  }

  /**
   * Get all user sessions
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return await TokenService.getUserSessions(userId);
  }

  /**
   * Delete all user sessions (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await TokenService.deleteAllUserSessions(userId);
  }

  /**
   * Delete session by device
   */
  async deleteDeviceSession(userId: string, deviceId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    const targetSession = sessions.find(s => s.deviceId === deviceId);

    if (targetSession) {
      await this.deleteSession(targetSession.sessionId);
      logger.info('Device session deleted', { userId, deviceId });
    }
  }
}

export default new SessionService();
