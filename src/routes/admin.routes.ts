import { Router, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import RedisManager from '../config/redis.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin panel route
router.get('/admin', (_req: Request, res: Response) => {
  const adminIndexPath = path.join(__dirname, '..', '..', 'public', 'admin', 'index.html');
  res.sendFile(adminIndexPath, (err) => {
    if (err) {
      res.status(404).json({ 
        error: 'Admin panel not found',
        message: 'Please build the admin frontend first' 
      });
    }
  });
});

// Admin API endpoints
router.get('/admin/api/stats', (_req: Request, res: Response) => {
  const redisStatus = RedisManager.getStatus();
  
  res.json({
    gateway: {
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    redis: {
      enabled: redisStatus.enabled,
      connected: redisStatus.connected,
      connecting: redisStatus.connecting,
      lastError: redisStatus.lastError,
      lastErrorTime: redisStatus.lastErrorTime,
      lastConnectedAt: redisStatus.lastConnectedAt,
      reconnectAttempts: redisStatus.reconnectAttempts
    },
    services: {
      registered: 3,
      healthy: 0, // TODO: Implement health checks
      unhealthy: 3
    },
    requests: {
      total: 0, // TODO: Implement request counter
      errors: 0,
      rateLimit: 0
    }
  });
});

export default router;