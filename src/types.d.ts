import type { ExtendedJWTPayload } from './middlewares/auth.middleware.js';
import type { SocialProfile } from './auth/oauth/oauth.service.js';

declare global {
  namespace Express {
    // User can be either ExtendedJWTPayload (for JWT auth) or SocialProfile (for OAuth)
    interface User extends Partial<ExtendedJWTPayload>, Partial<SocialProfile> {
      [key: string]: any; // Index signature for compatibility
    }
  }
}
export {};