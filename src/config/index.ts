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
  
  // Redis Configuration
  redis: {
    enabled: process.env.REDIS_ENABLED !== 'false', // Enabled by default unless explicitly disabled
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  
  // JWT Secrets
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || ''
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
  },
  
  // Circuit Breaker Configuration
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '10000', 10)
  },
  
  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false' // Enabled by default unless explicitly disabled
  },
  
  // Frontend URL (for OAuth redirects)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

export default config;
