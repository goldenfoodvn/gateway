import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import JWTService from '../auth/jwt.service.js';
import TokenService from '../auth/token.service.js';
import SessionService from '../auth/session.service.js';
import type { SocialProfile } from '../auth/oauth/oauth.service.js';
import logger from '../utils/logger.js';
import { authRateLimiter } from '../middlewares/rate-limiter.middleware.js';
import config from '../config/index.js';

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
    res.redirect('/auth/callback#error=no_email');
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

  // Redirect to frontend with tokens in URL hash (more secure than query params)
  const redirectUrl = new URL('/auth/callback', config.frontendUrl);
  redirectUrl.hash = `access_token=${encodeURIComponent(tokenPair.accessToken)}&refresh_token=${encodeURIComponent(tokenPair.refreshToken)}&expires_in=${tokenPair.expiresIn}&token_type=Bearer&provider=${encodeURIComponent(socialProfile.provider)}&email=${encodeURIComponent(socialProfile.email)}&name=${encodeURIComponent(socialProfile.name || '')}`;
  
  res.redirect(redirectUrl.toString());
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
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect('/auth/callback#error=google_not_configured');
    }
    next();
  },
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
    failureRedirect: '/auth/callback#error=google_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('Google OAuth callback error', { error: error.message });
      res.redirect('/auth/callback#error=oauth_failed');
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
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.redirect('/auth/callback#error=github_not_configured');
    }
    next();
  },
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
    failureRedirect: '/auth/callback#error=github_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('GitHub OAuth callback error', { error: error.message });
      res.redirect('/auth/callback#error=oauth_failed');
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
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.redirect('/auth/callback#error=facebook_not_configured&message=Please configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env');
    }
    next();
  },
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
    failureRedirect: '/auth/callback#error=facebook_auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      await handleOAuthCallback(req, res, req.user as SocialProfile);
    } catch (error: any) {
      logger.error('Facebook OAuth callback error', { error: error.message });
      res.redirect('/auth/callback#error=oauth_failed');
    }
  }
);

export default router;
