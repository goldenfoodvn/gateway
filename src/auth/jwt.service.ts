import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { TokenPayload, TokenPair } from '../types/auth.types.js';
import logger from '../utils/logger.js';

export class JWTService {
  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;
  private readonly ACCESS_TTL = '15m'; // 15 minutes
  private readonly REFRESH_TTL = '7d'; // 7 days
  private readonly ACCESS_TTL_SECONDS = 15 * 60; // 900 seconds
  private readonly REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds

  constructor() {
    this.ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production';
    this.REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

    if (process.env.NODE_ENV === 'production') {
      if (this.ACCESS_SECRET === 'your-access-secret-key-change-in-production') {
        logger.warn('WARNING: Using default JWT_ACCESS_SECRET in production!');
      }
      if (this.REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
        logger.warn('WARNING: Using default JWT_REFRESH_SECRET in production!');
      }
    }
  }

  /**
   * Generate access and refresh token pair
   */
  generateTokenPair(payload: Omit<TokenPayload, 'sessionId'>): TokenPair {
    const sessionId = uuidv4();

    const accessPayload: TokenPayload = {
      ...payload,
      sessionId
    };

    const accessToken = jwt.sign(
      accessPayload,
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_TTL }
    );

    const refreshPayload = {
      userId: payload.userId,
      sessionId,
      deviceId: payload.deviceId,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(
      refreshPayload,
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_TTL }
    );

    logger.info('Token pair generated', {
      userId: payload.userId,
      sessionId,
      deviceId: payload.deviceId
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.ACCESS_TTL_SECONDS,
      refreshExpiresIn: this.REFRESH_TTL_SECONDS
    };
  }

  /**
   * Generate new access token (used in token refresh)
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      payload,
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_TTL }
    );
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET) as TokenPayload;
      return decoded;
    } catch (error: any) {
      logger.error('Access token verification failed', { error: error.message });
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET);
      return decoded;
    } catch (error: any) {
      logger.error('Refresh token verification failed', { error: error.message });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token will expire soon (< 5 minutes)
   */
  willExpireSoon(token: string): boolean {
    try {
      const decoded = this.decodeToken(token) as any;
      if (!decoded || !decoded.exp) return true;

      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      return expiresIn < 300; // Less than 5 minutes
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): number | null {
    try {
      const decoded = this.decodeToken(token) as any;
      return decoded?.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Get access token TTL in seconds
   */
  getAccessTTL(): number {
    return this.ACCESS_TTL_SECONDS;
  }

  /**
   * Get refresh token TTL in seconds
   */
  getRefreshTTL(): number {
    return this.REFRESH_TTL_SECONDS;
  }
}

export default new JWTService();
