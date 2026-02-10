import { createClient } from 'redis';
import logger from '../utils/logger.js';

interface RedisStatus {
  enabled: boolean;
  connected: boolean;
  connecting: boolean;
  lastError: string | null;
  lastErrorTime: number | null;
  lastConnectedAt: number | null;
  reconnectAttempts: number;
}

export class RedisManager {
  private static client: ReturnType<typeof createClient> | null = null;
  private static isConnected = false;
  private static isConnecting = false;
  private static enabled = true;
  private static lastError: string | null = null;
  private static lastErrorTime: number | null = null;
  private static lastConnectedAt: number | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 10;
  private static reconnectDelay = 1000; // Start with 1 second
  private static maxReconnectDelay = 30000; // Max 30 seconds
  private static reconnectTimer: NodeJS.Timeout | null = null;
  
  // Log throttling
  private static lastLogTime: { [key: string]: number } = {};
  private static logThrottleMs = 15000; // 15 seconds

  /**
   * Throttled logger - only logs same message once per throttle period
   */
  private static throttledLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const key = `${level}:${message}`;
    const now = Date.now();
    const lastLog = this.lastLogTime[key] || 0;
    
    if (now - lastLog >= this.logThrottleMs) {
      this.lastLogTime[key] = now;
      
      if (level === 'error') {
        logger.error(message, data);
      } else if (level === 'warn') {
        logger.warn(message, data);
      } else {
        logger.info(message, data);
      }
    }
  }

  static async connect() {
    // Check if Redis is enabled
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    this.enabled = redisEnabled;
    
    if (!redisEnabled) {
      logger.info('Redis is disabled via REDIS_ENABLED=false');
      return null;
    }

    if (this.isConnected && this.client) {
      return this.client;
    }

    if (this.isConnecting) {
      logger.debug('Redis connection already in progress');
      return null;
    }

    this.isConnecting = true;

    try {
      // Support REDIS_URL or individual params
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this.client = createClient({ url: redisUrl });
      } else {
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD;
        const db = parseInt(process.env.REDIS_DB || '0', 10);

        this.client = createClient({
          socket: {
            host,
            port,
            // Disable built-in reconnect strategy - we handle reconnection manually
            // via scheduleReconnect() to have more control over backoff and logging
            reconnectStrategy: () => {
              return new Error('Reconnect handled manually');
            }
          },
          password,
          database: db
        });
      }

      this.client.on('error', (err) => {
        this.lastError = err.message;
        this.lastErrorTime = Date.now();
        this.isConnected = false;
        
        // Throttled error logging to prevent spam
        this.throttledLog('error', 'Redis Client Error', { error: err.message });
        
        // Trigger reconnection
        this.scheduleReconnect();
      });

      this.client.on('connect', () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.lastConnectedAt = Date.now();
        
        // Only log once when connected (not throttled)
        logger.info('Redis connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isConnecting = false;
      });

      this.client.on('end', () => {
        this.throttledLog('warn', 'Redis connection ended');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      await this.client.connect();
      return this.client;
      
    } catch (error: any) {
      this.lastError = error.message;
      this.lastErrorTime = Date.now();
      this.isConnecting = false;
      this.isConnected = false;
      
      this.throttledLog('error', 'Failed to connect to Redis', { error: error.message });
      this.scheduleReconnect();
      
      return null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private static scheduleReconnect() {
    if (!this.enabled) {
      return;
    }

    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.throttledLog('warn', 'Max Redis reconnection attempts reached, will retry on next request');
      this.reconnectAttempts = 0; // Reset for future attempts
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.throttledLog('info', `Scheduling Redis reconnect attempt ${this.reconnectAttempts}`, { 
      delayMs: delay 
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        this.throttledLog('error', 'Redis reconnection failed', { error: err.message });
      });
    }, delay);
  }

  static async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        // Ignore errors on disconnect
      }
      this.isConnected = false;
      this.isConnecting = false;
      this.client = null;
    }
  }

  static getClient() {
    if (!this.enabled) {
      throw new Error('Redis is disabled');
    }
    
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Get current Redis status
   */
  static getStatus(): RedisStatus {
    return {
      enabled: this.enabled,
      connected: this.isConnected,
      connecting: this.isConnecting,
      lastError: this.lastError,
      lastErrorTime: this.lastErrorTime,
      lastConnectedAt: this.lastConnectedAt,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Check if Redis is available for use
   */
  static isAvailable(): boolean {
    return this.enabled && this.isConnected && this.client !== null;
  }

  // Helper methods
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  static async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  static async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  static async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  static async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  static async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  static async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, seconds);
  }
}

export default RedisManager;
