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
      const socialProfile = req.user as SocialProfile;
      
      if (!socialProfile || !socialProfile.email) {
        logger.error('Google OAuth: No profile or email');
        return res.redirect('/auth/login?error=no_email');
      }

      // Extract device info from request
      const deviceId = (req.headers['x-device-id'] as string) || 'web-oauth-google';
      const deviceName = (req.headers['x-device-name'] as string) || 'Google OAuth';
      const deviceType = (req.headers['x-device-type'] as 'web' | 'mobile' | 'desktop') || 'web';
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // For OAuth, use the provider ID as userId (or you might want to map this to your user database)
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

      logger.info('Google OAuth login successful', { 
        userId, 
        email: socialProfile.email 
      });

      // Return tokens in response (you might want to redirect with tokens in query params or use a different approach)
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
      const socialProfile = req.user as SocialProfile;
      
      if (!socialProfile || !socialProfile.email) {
        logger.error('GitHub OAuth: No profile or email');
        return res.redirect('/auth/login?error=no_email');
      }

      // Extract device info from request
      const deviceId = (req.headers['x-device-id'] as string) || 'web-oauth-github';
      const deviceName = (req.headers['x-device-name'] as string) || 'GitHub OAuth';
      const deviceType = (req.headers['x-device-type'] as 'web' | 'mobile' | 'desktop') || 'web';
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // For OAuth, use the provider ID as userId
      const userId = `${socialProfile.provider}:${socialProfile.providerId}`;

      // Generate JWT token pair
      const tokenPair = JWTService.generateTokenPair({
        userId,
        email: socialProfile.email,
        roles: ['user'],
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

      logger.info('GitHub OAuth login successful', { 
        userId, 
        email: socialProfile.email 
      });

      // Return tokens in response
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
      const socialProfile = req.user as SocialProfile;
      
      if (!socialProfile || !socialProfile.email) {
        logger.error('Facebook OAuth: No profile or email');
        return res.redirect('/auth/login?error=no_email');
      }

      // Extract device info from request
      const deviceId = (req.headers['x-device-id'] as string) || 'web-oauth-facebook';
      const deviceName = (req.headers['x-device-name'] as string) || 'Facebook OAuth';
      const deviceType = (req.headers['x-device-type'] as 'web' | 'mobile' | 'desktop') || 'web';
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // For OAuth, use the provider ID as userId
      const userId = `${socialProfile.provider}:${socialProfile.providerId}`;

      // Generate JWT token pair
      const tokenPair = JWTService.generateTokenPair({
        userId,
        email: socialProfile.email,
        roles: ['user'],
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

      logger.info('Facebook OAuth login successful', { 
        userId, 
        email: socialProfile.email 
      });

      // Return tokens in response
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
    } catch (error: any) {
      logger.error('Facebook OAuth callback error', { error: error.message });
      res.status(500).json({ error: 'OAuth authentication failed' });
    }
  }
);

export default router;
