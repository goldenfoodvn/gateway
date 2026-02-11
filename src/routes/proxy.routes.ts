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
  
  // Tạo proxy middleware với error handling
  const proxyMiddleware = createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    pathRewrite: {
      [`^${path}`]: ''
    },
    timeout: service.timeout,
    // Xử lý lỗi proxy
    on: {
      error: (err, req, res) => {
        logger.error(`Proxy error for ${key}:`, err.message);
        // Chỉ gửi response nếu headers chưa được gửi và res là Response object
        if (res && typeof (res as any).status === 'function' && !(res as any).headersSent) {
          (res as Response).status(503).json({
            error: 'service_unavailable',
            message: 'The service is currently unavailable',
            service: key
          });
        }
      }
    }
  });
  
  // Tạo function để wrap proxy middleware với Promise
  const proxyFunction = (req: Request, res: Response): Promise<void> => {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      
      // Lắng nghe khi response hoàn thành
      const onFinish = () => {
        if (!isResolved) {
          isResolved = true;
          if (res.statusCode >= 500) {
            reject(new Error(`Service returned ${res.statusCode}`));
          } else {
            resolve();
          }
        }
      };
      
      // Lắng nghe lỗi
      const onError = (err: Error) => {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      };
      
      res.once('finish', onFinish);
      res.once('error', onError);
      
      // Call proxy middleware
      (proxyMiddleware as RequestHandler)(req, res, (err?: any) => {
        if (err && !isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    });
  };
  
  // Tạo Circuit Breaker cho service này
  const breaker = new CircuitBreaker(proxyFunction, {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
    name: key
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
    // Kiểm tra xem circuit breaker có mở không trước khi gọi service
    if (breaker.opened) {
      logger.warn(`Circuit breaker is OPEN for ${key}, rejecting request immediately`);
      return res.status(503).json({
        error: 'service_unavailable',
        message: `The ${service.name} is temporarily unavailable. Please try again later.`,
        service: key,
        circuitBreakerState: 'open'
      });
    }
    
    try {
      await breaker.fire(req, res);
    } catch (error) {
      // Chỉ xử lý lỗi nếu response chưa được gửi
      if (!res.headersSent) {
        logger.error(`Error handling request for ${key}:`, error);
        res.status(503).json({
          error: 'service_error',
          message: 'An error occurred while processing your request',
          service: key
        });
      }
    }
  });
});

export default router;