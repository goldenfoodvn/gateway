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
    logger.warn('GitHub OAuth not configured - registering disabled strategy');
    
    // Register a disabled strategy to prevent "Unknown strategy" error
    class DisabledStrategy {
      name = 'github';
      authenticate(this: any, req: any) {
        this.fail({ 
          message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file.' 
        }, 501);
      }
    }
    
    passport.use('github', new DisabledStrategy() as any);
    logger.info('GitHub OAuth strategy registered as disabled');
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
          const socialProfile = OAuthService.mapGitHubProfile(profile as unknown as GitHubProfile);
          
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
