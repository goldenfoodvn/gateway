import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import type { Profile } from 'passport-facebook';
import OAuthService, { type FacebookProfile } from '../oauth.service.js';
import logger from '../../../utils/logger.js';

export function setupFacebookStrategy() {
  const clientID = process.env.FACEBOOK_APP_ID || '';
  const clientSecret = process.env.FACEBOOK_APP_SECRET || '';
  const callbackURL = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback';

  if (!clientID || !clientSecret) {
    logger.warn('Facebook OAuth not configured - missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
    return;
  }

  passport.use(
    new FacebookStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        profileFields: ['id', 'displayName', 'emails', 'name', 'photos']
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any) => void
      ) => {
        try {
          logger.info('Facebook OAuth callback', { profileId: profile.id });
          
          // Map profile to internal format
          const socialProfile = OAuthService.mapFacebookProfile(profile as FacebookProfile);
          
          // Pass the social profile to the route handler
          done(null, socialProfile);
        } catch (error: any) {
          logger.error('Facebook OAuth error', { error: error.message });
          done(error, undefined);
        }
      }
    )
  );

  logger.info('Facebook OAuth strategy configured');
}
