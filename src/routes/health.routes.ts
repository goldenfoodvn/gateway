import { Router } from 'express';
import type { Request, Response } from 'express';
import RedisManager from '../config/redis.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const redisStatus = RedisManager.getStatus();
  
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime(),
    redis: {
      enabled: redisStatus.enabled,
      connected: redisStatus.connected,
      connecting: redisStatus.connecting,
      lastError: redisStatus.lastError,
      lastErrorTime: redisStatus.lastErrorTime,
      lastConnectedAt: redisStatus.lastConnectedAt,
      reconnectAttempts: redisStatus.reconnectAttempts
    }
  });
});

export default router;