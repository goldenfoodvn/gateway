/**
 * @deprecated This file is deprecated. Services are now managed dynamically via Redis.
 * Use RegistryService from src/services/registry.service.ts instead.
 * This file is kept for reference only.
 */

export interface ServiceConfig {
  name: string;
  url: string;
  healthCheck?: string;
  timeout?: number;
}

export const ServiceRegistry: Record<string, ServiceConfig> = {
  'user-service': {
    name: 'User Service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    healthCheck: '/health',
    timeout: 5000
  },
  'product-service': {
    name: 'Product Service',
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    healthCheck: '/health',
    timeout: 5000
  },
  'order-service': {
    name: 'Order Service',
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    healthCheck: '/health',
    timeout: 5000
  }
};

export default ServiceRegistry;