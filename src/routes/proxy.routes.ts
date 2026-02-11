import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';
import ServiceRegistry from '../config/services.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router = Router();

// Tạo Circuit Breaker cho mỗi service
const circuitBreakers = new Map<string, CircuitBreaker>();

// Dynamically create proxy routes for each registered service
Object.entries(ServiceRegistry).forEach(([key, service]) => {
  const path = `/api/${key.replace('-service', '')}`;
  
  logger.info(`Registering proxy route: ${path} → ${service.url}`);
  
  // Tạo proxy middleware
  const proxyMiddleware = createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    pathRewrite: {
      [`^${path}`]: ''
    },
    timeout: service.timeout
  });
  
  // Tạo function để wrap proxy middleware với Promise
  const proxyFunction = (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Call proxy middleware
      (proxyMiddleware as RequestHandler)(req, res, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      
      // Lắng nghe khi proxy hoàn thành
      res.on('finish', () => {
        if (res.statusCode >= 500) {
          reject(new Error(`Service returned ${res.statusCode}`));
        } else {
          resolve();
        }
      });
    });
  };
  
  // Tạo Circuit Breaker cho service này
  const breaker = new CircuitBreaker(proxyFunction, {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout
  });
  
  // Log các sự kiện của Circuit Breaker
  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPEN for ${key} (${service.url})`);
  });
  
  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN for ${key} (${service.url})`);
  });
  
  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${key} (${service.url})`);
  });
  
  circuitBreakers.set(key, breaker);
  
  // Middleware sử dụng Circuit Breaker
  router.use(path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await breaker.fire(req, res, next);
    } catch (error) {
      // Circuit breaker mở hoặc service lỗi
      if (breaker.opened) {
        logger.error(`Circuit breaker is OPEN for ${key}, rejecting request`);
        res.status(503).json({
          error: 'service_unavailable',
          message: `The ${service.name} is temporarily unavailable. Please try again later.`,
          service: key
        });
      } else {
        // Lỗi khác từ proxy
        logger.error(`Proxy error for ${key}:`, error);
        next(error);
      }
    }
  });
});

export default router;