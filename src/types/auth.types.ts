export interface TokenPayload {
  userId: string;
  email: string;
  roles?: string[];
  sessionId: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'web' | 'mobile' | 'desktop';
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface Session {
  sessionId: string;
  userId: string;
  email: string;
  roles: string[];
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface RefreshTokenData {
  userId: string;
  sessionId: string;
  deviceId: string;
  createdAt: string;
}
