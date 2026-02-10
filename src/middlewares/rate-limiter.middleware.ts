import type { Request, Response } from 'express';
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
    
    // Create a wrapper function that adapts Redis client's sendCommand to rate-limit-redis's SendCommandFn
    // Redis v4 client.sendCommand expects: (args: string[]) => Promise<RedisReply>
    // rate-limit-redis SendCommandFn expects: (...args: string[]) => Promise<RedisReply>
    // We need to convert from spread args to array and handle the type cast
    const sendCommand: SendCommandFn = ((...args: string[]) => {
      // Use type assertion as the return types are compatible but TypeScript can't verify this
      return (client as any).sendCommand(args) as Promise<any>;
    }) as SendCommandFn;
    
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