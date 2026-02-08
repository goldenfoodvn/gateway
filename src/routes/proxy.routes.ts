import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import ServiceRegistry from '../config/services.js';
import logger from '../utils/logger.js';

const router = Router();

// Dynamically create proxy routes for each registered service
Object.entries(ServiceRegistry).forEach(([key, service]) => {
  const path = `/api/${key.replace('-service', '')}`;
  
  logger.info(`Registering proxy route: ${path} → ${service.url}`);
  
  router.use(
    path,
    createProxyMiddleware({
      target: service.url,
      changeOrigin: true,
      pathRewrite: {
        [`^${path}`]: ''
      },
      timeout: service.timeout
    })
  );
});

export default router;