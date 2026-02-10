import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { SendCommandFn } from 'rate-limit-redis';
import RedisManager from '../config/redis.js';
import logger from '../utils/logger.js';

// Track if we've already logged the fallback warning (shared to avoid duplicate messages)
let hasLoggedRedisFallback = false;

/**
 * Create a Redis store wrapper that's compatible with express-rate-limit
 * Returns undefined if Redis is not available
 * 
 * Uses try/catch around RedisManager.getClient() instead of isAvailable()
 * to avoid TypeScript type issues and ensure clean fallback
 */
function createRedisStore() {
  try {
    const client = RedisManager.getClient();
    
    // Cast sendCommand to satisfy SendCommandFn type
    // Redis client's sendCommand takes an array, but SendCommandFn expects spread args
    const sendCommand: SendCommandFn = ((...args: string[]) => 
      (client as any).sendCommand(args)
    ) as SendCommandFn;
    
    return new RedisStore({
      sendCommand
    });
  } catch (error) {
    // Redis not available - will fall back to in-memory limiter
    return undefined;
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
    store: redisStore, // Use Redis if available, otherwise default in-memory
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
    store: redisStore, // Use Redis if available, otherwise default in-memory
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ 
        error: 'Too many authentication attempts, please try again later.' 
      });
    }
  });
}

export default rateLimiter;