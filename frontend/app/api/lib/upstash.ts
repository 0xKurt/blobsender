import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Get Upstash Redis client (singleton)
 */
export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('Upstash Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    }
    
    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
}

/**
 * Check if Upstash is configured
 */
export function isUpstashConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

