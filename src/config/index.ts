import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // JWT Configuration
  auth: {
    jwksUri: process.env.AUTH_JWKS_URI || '',
    audience: process.env.AUTH_AUDIENCE || '',
    issuer: process.env.AUTH_ISSUER || ''
  },
  
  // Gateway Config
  gateway: {
    partnerEventUrl: process.env.PARTNER_EVENT_URL || 'http://localhost:4001/platform/events',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || ''
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  
  // Services Registry
  services: {
    'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3001',
    'product-service': process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    'order-service': process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
  }
};

export default config;
