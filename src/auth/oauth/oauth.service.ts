import logger from '../../utils/logger.js';

export interface SocialProfile {
  provider: 'google' | 'github' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
}

// Type definitions for social provider profiles
export interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  _json: any;
}

export interface GitHubProfile {
  id: string;
  username?: string;
  displayName: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  _json: any;
}

export interface FacebookProfile {
  id: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: any;
}

export class OAuthService {
  /**
   * Map Google profile to SocialProfile
   */
  mapGoogleProfile(profile: GoogleProfile): SocialProfile {
    const email = profile.emails?.[0]?.value || '';
    const emailVerified = profile.emails?.[0]?.verified || false;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const avatar = profile.photos?.[0]?.value || '';

    logger.info('Mapping Google profile', { 
      providerId: profile.id, 
      email 
    });

    return {
      provider: 'google',
      providerId: profile.id,
      email,
      name: profile.displayName,
      firstName,
      lastName,
      avatar,
      emailVerified
    };
  }

  /**
   * Map GitHub profile to SocialProfile
   */
  mapGitHubProfile(profile: GitHubProfile): SocialProfile {
    const email = profile.emails?.[0]?.value || '';
    const emailVerified = profile.emails?.[0]?.verified || false;
    const avatar = profile.photos?.[0]?.value || '';

    logger.info('Mapping GitHub profile', { 
      providerId: profile.id, 
      email 
    });

    return {
      provider: 'github',
      providerId: profile.id,
      email,
      name: profile.displayName || profile.username || 'GitHub User',
      avatar,
      emailVerified
    };
  }

  /**
   * Map Facebook profile to SocialProfile
   */
  mapFacebookProfile(profile: FacebookProfile): SocialProfile {
    const email = profile.emails?.[0]?.value || '';
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const avatar = profile.photos?.[0]?.value || '';

    logger.info('Mapping Facebook profile', { 
      providerId: profile.id, 
      email 
    });

    return {
      provider: 'facebook',
      providerId: profile.id,
      email,
      name: profile.displayName,
      firstName,
      lastName,
      avatar,
      emailVerified: false // Facebook doesn't provide email verification status
    };
  }
}

export default new OAuthService();
