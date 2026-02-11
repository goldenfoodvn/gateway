import RedisManager from '../config/redis.js';
import logger from '../utils/logger.js';

interface ServiceConfig {
  name: string;
  url: string;
}

interface CacheEntry {
  value: string | null;
  timestamp: number;
}

/**
 * Service Registry - Dynamic service discovery using Redis
 * Manages service registration and lookup with in-memory caching
 */
export class RegistryService {
  private static readonly REDIS_KEY = 'gateway:services';
  private static readonly CACHE_TTL_MS = 10000; // 10 seconds cache
  private static cache: Map<string, CacheEntry> = new Map();

  /**
   * Register a service in Redis
   * @param name - Service name (e.g., 'user', 'product', 'order')
   * @param url - Service URL (e.g., 'http://localhost:3001')
   */
  static async setService(name: string, url: string): Promise<void> {
    try {
      if (!RedisManager.isAvailable()) {
        throw new Error('Redis is not available');
      }

      const client = RedisManager.getClient();
      await client.hSet(this.REDIS_KEY, name, url);
      
      // Update cache
      this.cache.set(name, {
        value: url,
        timestamp: Date.now()
      });

      logger.info(`Service registered: ${name} -> ${url}`);
    } catch (error: any) {
      logger.error(`Failed to register service ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get service URL from Redis (with in-memory cache)
   * @param name - Service name
   * @returns Service URL or null if not found
   */
  static async getService(name: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.cache.get(name);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
        logger.debug(`Cache hit for service: ${name}`);
        return cached.value;
      }

      // Cache miss or expired - fetch from Redis
      if (!RedisManager.isAvailable()) {
        logger.warn('Redis is not available, cannot fetch service');
        // Return cached value even if expired as fallback
        if (cached) {
          logger.warn(`Using expired cache for service: ${name}`);
          return cached.value;
        }
        return null;
      }

      const client = RedisManager.getClient();
      const url = await client.hGet(this.REDIS_KEY, name);

      // Update cache
      this.cache.set(name, {
        value: url || null,
        timestamp: Date.now()
      });

      return url || null;
    } catch (error: any) {
      logger.error(`Failed to get service ${name}:`, error.message);
      
      // Return cached value as fallback on error
      const cached = this.cache.get(name);
      if (cached) {
        logger.warn(`Using cached value for service ${name} due to Redis error`);
        return cached.value;
      }
      
      return null;
    }
  }

  /**
   * Remove a service from Redis
   * @param name - Service name to remove
   */
  static async removeService(name: string): Promise<void> {
    try {
      if (!RedisManager.isAvailable()) {
        throw new Error('Redis is not available');
      }

      const client = RedisManager.getClient();
      await client.hDel(this.REDIS_KEY, name);
      
      // Remove from cache
      this.cache.delete(name);

      logger.info(`Service removed: ${name}`);
    } catch (error: any) {
      logger.error(`Failed to remove service ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all registered services
   * @returns Object with service names as keys and URLs as values
   */
  static async getAllServices(): Promise<Record<string, string>> {
    try {
      if (!RedisManager.isAvailable()) {
        throw new Error('Redis is not available');
      }

      const client = RedisManager.getClient();
      const services = await client.hGetAll(this.REDIS_KEY);

      logger.debug(`Retrieved ${Object.keys(services).length} services from registry`);
      return services;
    } catch (error: any) {
      logger.error('Failed to get all services:', error.message);
      throw error;
    }
  }

  /**
   * Clear the in-memory cache
   */
  static clearCache(): void {
    this.cache.clear();
    logger.debug('Service cache cleared');
  }
}

export default RegistryService;
