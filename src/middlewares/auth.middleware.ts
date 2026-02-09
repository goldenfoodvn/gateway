import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import config from '../config/index.js';
import TokenService from '../auth/token.service.js';

let remoteJWKSet: ReturnType<typeof createRemoteJWKSet> | null = null;

if (config.auth.jwksUri) {
  try {
    remoteJWKSet = createRemoteJWKSet(new URL(config.auth.jwksUri));
  } catch (err) {
    console.warn('[auth] Invalid AUTH_JWKS_URI:', err);
  }
} else {
  console.warn('[auth] AUTH_JWKS_URI not set');
}

export interface ExtendedJWTPayload extends JWTPayload {
  userId?: string;
  email?: string;
  sessionId?: string;
  roles?: string[];
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthRequest extends Request {
  user?: ExtendedJWTPayload;
}

function unauthorized(res: Response, message = 'Unauthorized') {
  res.status(401).json({ error: message });
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const auth = (req.headers.authorization ?? '').trim();
    
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      unauthorized(res, 'Missing or invalid Authorization header');
      return;
    }
    
    const token = auth.slice(7).trim();
    
    if (!remoteJWKSet) {
      unauthorized(res, 'JWKS not configured on server');
      return;
    }

    const verifyOptions: Parameters<typeof jwtVerify>[2] = {};
    if (config.auth.audience) verifyOptions.audience = config.auth.audience;
    if (config.auth.issuer) verifyOptions.issuer = config.auth.issuer;

    const { payload } = await jwtVerify(token, remoteJWKSet, verifyOptions);
    
    // Check if token is blacklisted
    const isBlacklisted = await TokenService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      unauthorized(res, 'Token has been revoked');
      return;
    }
    
    req.user = payload;
    
    next();
  } catch (err: any) {
    console.warn('[auth] Token verify failed:', err?.message);
    unauthorized(res, 'Invalid token');
  }
}

export default authMiddleware;