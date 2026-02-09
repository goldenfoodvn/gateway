import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import OAuthService, { type GitHubProfile } from '../oauth.service.js';
import logger from '../../../utils/logger.js';

export function setupGitHubStrategy() {
  const clientID = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
  const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

  if (!clientID || !clientSecret) {
    logger.warn('GitHub OAuth not configured - missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return;
  }

  passport.use(
    new GitHubStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['user:email']
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: Function
      ) => {
        try {
          logger.info('GitHub OAuth callback', { profileId: profile.id });
          
          // Map profile to internal format
          const socialProfile = OAuthService.mapGitHubProfile(profile as GitHubProfile);
          
          // Pass the social profile to the route handler
          done(null, socialProfile);
        } catch (error: any) {
          logger.error('GitHub OAuth error', { error: error.message });
          done(error, undefined);
        }
      }
    )
  );

  logger.info('GitHub OAuth strategy configured');
}
