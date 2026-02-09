import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { Profile } from 'passport-github2';
import OAuthService, { type GitHubProfile } from '../oauth.service.js';
import logger from '../../../utils/logger.js';

export function setupGitHubStrategy() {
  const clientID = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
  const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

  if (!clientID || !clientSecret) {
    logger.warn('GitHub OAuth not configured - strategy disabled');
    
    // Register a dummy strategy to prevent "Unknown strategy" error
    passport.use('github', {
      name: 'github',
      authenticate: function(req: any) {
        this.fail({ message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET' }, 501);
      }
    } as any);
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
        profile: Profile,
        done: (error: any, user?: any) => void
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
