import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware.js';
import JWTService from '../auth/jwt.service.js';
import TokenService from '../auth/token.service.js';
import SessionService from '../auth/session.service.js';
import logger from '../utils/logger.js';

const router = Router();

// Existing /me endpoint
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ 
    ok: true, 
    user: req.user ?? null 
  });
});

// 🆕 Login endpoint (generates tokens)
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, userId, roles } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Email and userId required' });
    }

    const deviceId = req.headers['x-device-id'] as string || 'web-default';
    const deviceName = req.headers['x-device-name'] as string || 'Web Browser';
    const deviceType = req.headers['x-device-type'] as ('web' | 'mobile' | 'desktop') || 'web';
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Generate token pair
    const tokenPair = JWTService.generateTokenPair({
      userId,
      email,
      roles: roles || [],
      deviceId,
      deviceName,
      deviceType,
      ipAddress,
      userAgent
    });

    // Store refresh token in Redis
    await TokenService.storeRefreshToken(
      tokenPair.refreshToken,
      {
        userId,
        sessionId: tokenPair.sessionId,
        deviceId,
        createdAt: new Date().toISOString()
      },
      tokenPair.refreshExpiresIn
    );

    // Create session
    await SessionService.createSession(
      {
        userId,
        email,
        roles,
        deviceId,
        deviceName,
        deviceType,
        ipAddress,
        userAgent
      },
      tokenPair.refreshExpiresIn
    );

    logger.info('User logged in', { userId, email, deviceId });

    res.json({
      ok: true,
      data: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: 'Bearer'
      }
    });
  } catch (error: any) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// 🆕 Refresh token endpoint
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = JWTService.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in Redis
    const tokenData = await TokenService.getRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get session
    const session = await SessionService.getSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Generate new access token
    const newAccessToken = JWTService.generateAccessToken({
      userId: session.userId,
      email: '', // You might want to store email in session
      roles: [],
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      deviceType: session.deviceType as any,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    });

    // Update session activity
    await SessionService.updateActivity(session.sessionId);

    logger.info('Token refreshed', { userId: session.userId });

    res.json({
      ok: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: JWTService.getAccessTTL(),
        tokenType: 'Bearer'
      }
    });
  } catch (error: any) {
    logger.error('Token refresh failed', { error: error.message });
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// 🆕 Logout endpoint
router.post('/auth/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const user = req.user;

    if (!user?.sessionId) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Blacklist access token
    const ttl = JWTService.getAccessTTL();
    await TokenService.blacklistToken(token, ttl);

    // Delete session
    await SessionService.deleteSession(user.sessionId);

    logger.info('User logged out', { userId: user.userId, sessionId: user.sessionId });

    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout failed', { error: error.message });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 🆕 Logout from all devices
router.post('/auth/logout-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user?.userId) {
      return res.status(400).json({ error: 'Invalid user' });
    }

    // Delete all user sessions
    await SessionService.deleteAllUserSessions(user.userId);

    logger.info('User logged out from all devices', { userId: user.userId });

    res.json({ ok: true, message: 'Logged out from all devices' });
  } catch (error: any) {
    logger.error('Logout all failed', { error: error.message });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 🆕 Get user sessions
router.get('/auth/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user?.userId) {
      return res.status(400).json({ error: 'Invalid user' });
    }

    const sessions = await SessionService.getUserSessions(user.userId);

    res.json({
      ok: true,
      data: {
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          deviceId: s.deviceId,
          deviceName: s.deviceName,
          deviceType: s.deviceType,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
          current: s.sessionId === user.sessionId
        }))
      }
    });
  } catch (error: any) {
    logger.error('Get sessions failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// 🆕 Delete specific session
router.delete('/auth/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;

    if (!user?.userId) {
      return res.status(400).json({ error: 'Invalid user' });
    }

    // Verify session belongs to user
    const session = await SessionService.getSession(sessionId);
    if (!session || session.userId !== user.userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await SessionService.deleteSession(sessionId);

    logger.info('Session deleted', { userId: user.userId, sessionId });

    res.json({ ok: true, message: 'Session deleted' });
  } catch (error: any) {
    logger.error('Delete session failed', { error: error.message });
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Existing webhook endpoint
router.post('/platform/auth/webhook', async (req: Request, res: Response) => {
  console.log('[webhook] Received:', req.body);
  res.json({ ok: true });
});

export default router;
