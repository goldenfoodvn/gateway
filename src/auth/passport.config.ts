import passport from 'passport';
import { setupGoogleStrategy } from './oauth/strategies/google.strategy.js';
import { setupGitHubStrategy } from './oauth/strategies/github.strategy.js';
import { setupFacebookStrategy } from './oauth/strategies/facebook.strategy.js';
import logger from '../utils/logger.js';

/**
 * Initialize Passport and setup all OAuth strategies
 */
export function initializePassport() {
  logger.info('Initializing Passport...');

  // Setup OAuth strategies
  setupGoogleStrategy();
  setupGitHubStrategy();
  setupFacebookStrategy();

  // Serialize user - not needed for stateless JWT auth
  // But required by Passport
  passport.serializeUser((user: Express.User, done: (err: any, id?: Express.User) => void) => {
    done(null, user);
  });

  // Deserialize user - not needed for stateless JWT auth
  passport.deserializeUser((user: Express.User, done: (err: any, user?: Express.User | false | null) => void) => {
    done(null, user);
  });

  logger.info('Passport initialized successfully');
}

export default initializePassport;
