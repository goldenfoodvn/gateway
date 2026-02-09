import { createClient } from 'redis';
import logger from '../utils/logger.js';

export class RedisManager {
  private static client: ReturnType<typeof createClient> | null = null;
  private static isConnected = false;

  static async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    const db = parseInt(process.env.REDIS_DB || '0', 10);

    this.client = createClient({
      socket: {
        host,
        port
      },
      password,
      database: db
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected');
      this.isConnected = false;
    });

    await this.client.connect();
    return this.client;
  }

  static async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
  }

  static getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
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
}

export default RedisManager;
