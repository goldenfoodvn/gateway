import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { SendCommandFn } from 'rate-limit-redis';
import RedisManager from '../config/redis.js';
import logger from '../utils/logger.js';

const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 100;
const DEFAULT_AUTH_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;
const DEV_WHITELIST = ['127.0.0.1', 'localhost'];

/**
 * Tự động xét có whitelist IP trong DEV/test
 */
function isWhitelisted(ip: string): boolean {
  return DEV_WHITELIST.includes(ip) || process.env.NODE_ENV === 'development';
}

/**
 * Tạo Redis store nếu khả dụng, đảm bảo fallback type safety.
 */
function createRedisStore() {
  try {
    const client = RedisManager.getClient();
    const sendCommand: SendCommandFn = ((...args: string[]) =>
      (client as any).sendCommand(args) as Promise<any>
    ) as SendCommandFn;
    return new RedisStore({ sendCommand });
  } catch (error) {
    logger.warn('Redis unavailable, using in-memory limiter');
    return undefined;
  }
}

/**
 * Rate limiter cho toàn bộ request - cấu hình động
 */
export function rateLimiter() {
  const redisStore = createRedisStore();

  return rateLimit({
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    skip: (req: Request) => isWhitelisted(req.ip),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  });
}

/**
 * Rate limiter cho các luồng auth (login/register/social) - max thấp hơn
 */
export function authRateLimiter() {
  const redisStore = createRedisStore();

  return rateLimit({
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    skip: (req: Request) => isWhitelisted(req.ip),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: 'Too many authentication attempts, please try again later.' });
    }
  });
}

export default rateLimiter;
