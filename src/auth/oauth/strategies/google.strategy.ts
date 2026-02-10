import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { VerifyCallback } from 'passport-google-oauth20';
import OAuthService, { type GoogleProfile } from '../oauth.service.js';
import logger from '../../../utils/logger.js';

export function setupGoogleStrategy() {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

  if (!clientID || !clientSecret) {
    logger.warn('Google OAuth not configured - registering disabled strategy');
    
    // Register a disabled strategy to prevent "Unknown strategy" error
    class DisabledStrategy {
      name = 'google';
      authenticate(this: any, req: any) {
        this.fail({ 
          message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file.' 
        }, 501);
      }
    }
    
    passport.use('google', new DisabledStrategy() as any);
    logger.info('Google OAuth strategy registered as disabled');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email']
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback
      ) => {
        try {
          logger.info('Google OAuth callback', { profileId: profile.id });
          
          // Map profile to internal format
          const socialProfile = OAuthService.mapGoogleProfile(profile as GoogleProfile);
          
          // Pass the social profile to the route handler
          done(null, socialProfile);
        } catch (error: any) {
          logger.error('Google OAuth error', { error: error.message });
          done(error, undefined);
        }
      }
    )
  );

  logger.info('Google OAuth strategy configured');
}
