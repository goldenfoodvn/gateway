import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisManager from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * General rate limiter - 100 requests per 15 minutes
 */
export function rateLimiter() {
  try {
    const client = RedisManager.getClient();
    
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-ignore - RedisStore types are not fully compatible
        sendCommand: (...args: string[]) => client.sendCommand(args),
      }),
      handler: (_req: Request, res: Response) => {
        res.status(429).json({ 
          error: 'Too many requests, please try again later.' 
        });
      }
    });
  } catch (error: any) {
    logger.warn('Redis not available, using in-memory rate limiter', { error: error.message });
    
    // Fallback to in-memory rate limiter
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({ 
          error: 'Too many requests, please try again later.' 
        });
      }
    });
  }
}

/**
 * Auth rate limiter - 5 requests per 15 minutes
 */
export function authRateLimiter() {
  try {
    const client = RedisManager.getClient();
    
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-ignore - RedisStore types are not fully compatible
        sendCommand: (...args: string[]) => client.sendCommand(args),
      }),
      handler: (_req: Request, res: Response) => {
        res.status(429).json({ 
          error: 'Too many authentication attempts, please try again later.' 
        });
      }
    });
  } catch (error: any) {
    logger.warn('Redis not available, using in-memory auth rate limiter', { error: error.message });
    
    // Fallback to in-memory rate limiter
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({ 
          error: 'Too many authentication attempts, please try again later.' 
        });
      }
    });
  }
}

export default rateLimiter;