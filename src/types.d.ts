import type { ExtendedJWTPayload } from './middlewares/auth.middleware.js';
import type { SocialProfile } from './auth/oauth/oauth.service.js';

declare global {
  namespace Express {
    // User can be either ExtendedJWTPayload (for JWT auth) or SocialProfile (for OAuth)
    // Properties are marked optional (?) to support both authentication flows
    // The index signature is required for Passport.js compatibility
    interface User {
      // Common properties
      userId?: string;
      email?: string;
      
      // JWT auth properties
      sessionId?: string;
      roles?: string[];
      deviceId?: string;
      deviceName?: string;
      deviceType?: string;
      ipAddress?: string;
      userAgent?: string;
      
      // OAuth properties
      provider?: 'google' | 'github' | 'facebook';
      providerId?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      emailVerified?: boolean;
      
      // Standard JWT properties from jose
      iss?: string;
      sub?: string;
      aud?: string | string[];
      exp?: number;
      nbf?: number;
      iat?: number;
      jti?: string;
      
      // Index signature for Passport.js compatibility
      [key: string]: any;
    }
  }
}
export {};