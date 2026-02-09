import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import JWTService from '../auth/jwt.service.js';
import TokenService from '../auth/token.service.js';
import SessionService from '../auth/session.service.js';
import type { SocialProfile } from '../auth/oauth/oauth.service.js';
import logger from '../utils/logger.js';
import { authRateLimiter } from '../middlewares/rate-limiter.middleware.js';

const router = Router();

/**
 * Helper function to process OAuth callback and generate tokens
 * NOTE: User ID mapping - This creates synthetic user IDs like "google:123456".
 * If you want to link multiple OAuth providers to the same user account,
 * you'll need to implement user account linking/mapping to your database.
 */
async function handleOAuthCallback(
  req: Request,
  res: Response,
  socialProfile: SocialProfile
): Promise<void> {
  if (!socialProfile || !socialProfile.email) {
    logger.error(`${socialProfile?.provider || 'OAuth'}: No profile or email`);
    res.redirect('/auth/login?error=no_email');
    return;
  }

  // Extract device info from request
  const deviceId = (req.headers['x-device-id'] as string) || `web-oauth-${socialProfile.provider}`;
  const deviceName = (req.headers['x-device-name'] as string) || `${socialProfile.provider} OAuth`;
  const deviceType = (req.headers['x-device-type'] as 'web' | 'mobile' | 'desktop') || 'web';
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // For OAuth, use the provider ID as userId
  // TODO: Map this to your user database to support multiple OAuth providers per user
  const userId = `${socialProfile.provider}:${socialProfile.providerId}`;

  // Generate JWT token pair
  const tokenPair = JWTService.generateTokenPair({
    userId,
    email: socialProfile.email,
    roles: ['user'], // Default role, adjust as needed
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
      email: socialProfile.email,
      roles: ['user'],
      deviceId,
      deviceName,
      deviceType,
      ipAddress,
      userAgent
    },
    tokenPair.refreshExpiresIn,
    tokenPair.sessionId
  );

  logger.info(`${socialProfile.provider} OAuth login successful`, { 
    userId, 
    email: socialProfile.email 
  });

  // Return tokens in response
  // NOTE: Refresh token is returned in JSON response for simplicity.
  // For production, consider using httpOnly cookies to reduce XSS risk.
  res.json({
    ok: true,
    data: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      tokenType: 'Bearer',
      user: {
        email: socialProfile.email,
        name: socialProfile.name,
        avatar: socialProfile.avatar,
        provider: socialProfile.provider
      }
    }
  });
}

// ===========================
// GOOGLE OAUTH
// ===========================

/**
 * Initiate Google OAuth login
 * GET /auth/google
 */
router.get(
  '/auth/google',
  authRateLimiter(),
  passport.authenticate('google', { 
    session: false,
    scope: ['profile', 'email']
  })
);

/**
 * Google OAuth callback
 * GET /auth/google/callback
 */
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/auth/login?error=google_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('Google OAuth callback error', { error: error.message });
      res.status(500).json({ error: 'OAuth authentication failed' });
    }
  }
);

// ===========================
// GITHUB OAUTH
// ===========================

/**
 * Initiate GitHub OAuth login
 * GET /auth/github
 */
router.get(
  '/auth/github',
  authRateLimiter(),
  passport.authenticate('github', { 
    session: false,
    scope: ['user:email']
  })
);

/**
 * GitHub OAuth callback
 * GET /auth/github/callback
 */
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { 
    session: false,
    failureRedirect: '/auth/login?error=github_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('GitHub OAuth callback error', { error: error.message });
      res.status(500).json({ error: 'OAuth authentication failed' });
    }
  }
);

// ===========================
// FACEBOOK OAUTH
// ===========================

/**
 * Initiate Facebook OAuth login
 * GET /auth/facebook
 */
router.get(
  '/auth/facebook',
  authRateLimiter(),
  passport.authenticate('facebook', { 
    session: false,
    scope: ['email']
  })
);

/**
 * Facebook OAuth callback
 * GET /auth/facebook/callback
 */
router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { 
    session: false,
    failureRedirect: '/auth/login?error=facebook_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('Facebook OAuth callback error', { error: error.message });
      res.status(500).json({ error: 'OAuth authentication failed' });
    }
  }
);

export default router;
