import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';
import RegistryService from '../services/registry.service.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router = Router();

// Circuit Breaker cache for services
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service
 */
function getCircuitBreaker(serviceName: string): CircuitBreaker {
  let breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    // Create wrapper function for proxy middleware
    const promisifyProxyMiddleware = (req: Request, res: Response): Promise<void> => {
      return new Promise((resolve, reject) => {
        let isResolved = false;
        
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
        
        const onError = (err: Error) => {
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        };
        
        res.once('finish', onFinish);
        res.once('error', onError);
        
        // This will be handled by the actual proxy middleware
        // The promise is just to track completion
        resolve();
      });
    };
    
    breaker = new CircuitBreaker(promisifyProxyMiddleware, {
      timeout: config.circuitBreaker.timeout,
      errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
      resetTimeout: config.circuitBreaker.resetTimeout,
      name: serviceName
    });
    
    breaker.on('open', () => {
      logger.warn(`Circuit breaker OPEN for ${serviceName}`);
    });
    
    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
    });
    
    breaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${serviceName}`);
    });
    
    circuitBreakers.set(serviceName, breaker);
  }
  
  return breaker;
}

/**
 * Dynamic proxy route handler - matches /api/:serviceName/*
 * Uses RegistryService to lookup service URL dynamically
 */
router.use('/api/:serviceName', async (req: Request, res: Response, next: NextFunction) => {
  const serviceName = req.params.serviceName;
  
  try {
    // Lookup service URL from registry
    const serviceUrl = await RegistryService.getService(serviceName);
    
    if (!serviceUrl) {
      logger.warn(`Service not found in registry: ${serviceName}`);
      return res.status(404).json({
        error: 'service_not_found',
        message: `Service '${serviceName}' is not registered`,
        service: serviceName
      });
    }
    
    logger.debug(`Proxying request to ${serviceName} -> ${serviceUrl}`);
    
    // Get or create circuit breaker for this service
    const breaker = getCircuitBreaker(serviceName);
    
    // Check if circuit breaker is open
    if (breaker.opened) {
      logger.warn(`Circuit breaker is OPEN for ${serviceName}`);
      return res.status(503).json({
        error: 'service_unavailable',
        message: `The service '${serviceName}' is temporarily unavailable. Please try again later.`,
        service: serviceName
      });
    }
    
    // Create dynamic proxy middleware with the service URL
    const proxyMiddleware = createProxyMiddleware({
      target: serviceUrl,
      changeOrigin: true,
      pathRewrite: (path: string) => {
        // Remove /api/:serviceName prefix
        return path.replace(`/api/${serviceName}`, '');
      },
      timeout: 5000,
      on: {
        error: (err: Error, req: Request, res: Response) => {
          logger.error(`Proxy error for ${serviceName}:`, err.message);
          
          // Track error in circuit breaker
          breaker.fire(req, res).catch(() => {});
          
          if (res && typeof (res as any).status === 'function' && !(res as any).headersSent) {
            (res as Response).status(503).json({
              error: 'service_unavailable',
              message: 'The service is currently unavailable',
              service: serviceName
            });
          }
        },
        proxyReq: (proxyReq: any, req: Request) => {
          logger.debug(`Proxying ${req.method} ${req.path} to ${serviceUrl}`);
        }
      }
    });
    
    // Execute proxy with circuit breaker tracking
    await breaker.fire(req, res);
    (proxyMiddleware as RequestHandler)(req, res, next);
    
  } catch (error: any) {
    logger.error(`Error handling request for ${serviceName}:`, error);
    
    if (!res.headersSent) {
      res.status(503).json({
        error: 'service_error',
        message: error.message || 'An error occurred while processing your request',
        service: serviceName
      });
    }
  }
});

export default router;