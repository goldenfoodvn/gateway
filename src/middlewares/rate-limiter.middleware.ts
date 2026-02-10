import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisManager from '../config/redis.js';
import logger from '../utils/logger.js';

// Track if we've already logged the fallback warning
let hasLoggedRedisFallback = false;

/**
 * Create a Redis store wrapper that's compatible with express-rate-limit
 * Returns null if Redis is not available
 */
function createRedisStore() {
  if (!RedisManager.isAvailable()) {
    return null;
  }
  
  try {
    const client = RedisManager.getClient();
    return new RedisStore({
      sendCommand: async (...args: string[]) => client.sendCommand(args) as any,
    });
  } catch (error) {
    return null;
  }
}

/**
 * General rate limiter - 100 requests per 15 minutes
 */
export function rateLimiter() {
  const redisStore = createRedisStore();
  
  if (!redisStore && !hasLoggedRedisFallback) {
    logger.warn('Redis not available, using in-memory rate limiter');
    hasLoggedRedisFallback = true;
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore || undefined, // Use Redis if available, otherwise default in-memory
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ 
        error: 'Too many requests, please try again later.' 
      });
    }
  });
}

/**
 * Auth rate limiter - 5 requests per 15 minutes
 */
export function authRateLimiter() {
  const redisStore = createRedisStore();
  
  if (!redisStore && !hasLoggedRedisFallback) {
    logger.warn('Redis not available, using in-memory auth rate limiter');
    hasLoggedRedisFallback = true;
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore || undefined, // Use Redis if available, otherwise default in-memory
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ 
        error: 'Too many authentication attempts, please try again later.' 
      });
    }
  });
}

export default rateLimiter;