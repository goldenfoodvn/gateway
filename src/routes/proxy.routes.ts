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
 * Create a proxy middleware wrapped in a circuit breaker
 */
function createProxyWithCircuitBreaker(serviceName: string, serviceUrl: string): {
  breaker: CircuitBreaker;
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  // Create proxy middleware
  const proxyMiddleware = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: (path: string) => {
      // Remove /api/:serviceName prefix
      return path.replace(`/api/${serviceName}`, '');
    },
    timeout: 5000,
    on: {
      error: (err: Error, req: any, res: any) => {
        logger.error(`Proxy error for ${serviceName}:`, err.message);
        
        if (res && typeof res.status === 'function' && !res.headersSent) {
          res.status(503).json({
            error: 'service_unavailable',
            message: 'The service is currently unavailable',
            service: serviceName
          });
        }
      },
      proxyReq: (proxyReq: any, req: any) => {
        logger.debug(`Proxying ${req.method} ${req.path} to ${serviceUrl}`);
      }
    }
  });

  // Wrapper function for circuit breaker
  const executeProxy = (req: Request, res: Response): Promise<void> => {
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

      // Execute proxy middleware
      (proxyMiddleware as RequestHandler)(req, res, (err?: any) => {
        if (err && !isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    });
  };

  // Get or create circuit breaker for this service
  let breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    breaker = new CircuitBreaker(executeProxy, {
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

  // Return handler that uses the breaker
  const handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await breaker.fire(req, res);
    } catch (error: any) {
      if (!res.headersSent) {
        const errorMessage = breaker.opened 
          ? `The service '${serviceName}' is temporarily unavailable. Please try again later.`
          : 'An error occurred while processing your request';
        
        logger.error(`Error handling request for ${serviceName}:`, error);
        res.status(503).json({
          error: 'service_unavailable',
          message: errorMessage,
          service: serviceName
        });
      }
    }
  };

  return { breaker, handler };
}

/**
 * Dynamic proxy route handler - matches /api/:serviceName/*
 * Uses RegistryService to lookup service URL dynamically
 */
router.use('/api/:serviceName', async (req: Request, res: Response, next: NextFunction) => {
  const serviceName = Array.isArray(req.params.serviceName) 
    ? req.params.serviceName[0] 
    : req.params.serviceName;
  
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
    
    // Create proxy with circuit breaker
    const { breaker, handler } = createProxyWithCircuitBreaker(serviceName, serviceUrl);
    
    // Check if circuit breaker is open before attempting
    if (breaker.opened) {
      logger.warn(`Circuit breaker is OPEN for ${serviceName}`);
      return res.status(503).json({
        error: 'service_unavailable',
        message: `The service '${serviceName}' is temporarily unavailable. Please try again later.`,
        service: serviceName
      });
    }
    
    // Execute proxy through circuit breaker
    await handler(req, res, next);
    
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