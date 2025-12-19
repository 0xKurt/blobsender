/**
 * Upstash Redis-based price quote cache for blob price API
 * This ensures quotes are accessible across different API routes and serverless function invocations
 * Uses Upstash Redis for persistence in serverless environments
 */

import { getRedisClient, isUpstashConfigured } from './upstash';

interface PriceQuote {
  priceWei: string;
  timestamp: number;
}

const QUOTE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_KEY_PREFIX = 'price-quote:';

/**
 * Store a price quote with a unique ID
 */
export async function storePriceQuote(quoteId: string, priceWei: string): Promise<void> {
  if (!isUpstashConfigured()) {
    const error = new Error('Upstash Redis is required for price quote caching. Please configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
    console.error('[price-cache]', error.message);
    throw error;
  }

  try {
    const redis = getRedisClient();
    const quote: PriceQuote = {
      priceWei,
      timestamp: Date.now(),
    };
    
    // Store quote with TTL (expires automatically)
    const quoteKey = `${REDIS_KEY_PREFIX}${quoteId}`;
    const ttlSeconds = Math.ceil(QUOTE_EXPIRY_MS / 1000);
    await redis.setex(quoteKey, ttlSeconds, quote);
    
    console.log(`[price-cache] Stored quote ID: ${quoteId} for price: ${priceWei} wei (TTL: ${ttlSeconds}s)`);
  } catch (error: unknown) {
    console.error('[price-cache] Error storing quote:', error);
    throw error;
  }
}

/**
 * Get cached price quote by ID
 * Returns null if quote doesn't exist or has expired
 */
export async function getPriceQuote(quoteId: string): Promise<string | null> {
  if (!isUpstashConfigured()) {
    console.error('[price-cache] Upstash not configured, cannot retrieve quote');
    return null;
  }

  try {
    const redis = getRedisClient();
    const quoteKey = `${REDIS_KEY_PREFIX}${quoteId}`;
    const quote = await redis.get<PriceQuote>(quoteKey);
    
    if (!quote) {
      console.log(`[price-cache] Quote ID not found: ${quoteId}`);
      return null;
    }
    
    // Double-check expiration (Redis TTL should handle this, but check anyway)
    const age = Date.now() - quote.timestamp;
    if (age > QUOTE_EXPIRY_MS) {
      console.log(`[price-cache] Quote ID expired: ${quoteId} (age: ${age}ms)`);
      // Delete the expired quote
      await redis.del(quoteKey);
      return null;
    }
    
    console.log(`[price-cache] Retrieved quote ID: ${quoteId} for price: ${quote.priceWei} wei (age: ${age}ms)`);
    return quote.priceWei;
  } catch (error: unknown) {
    console.error('[price-cache] Error getting quote:', error);
    return null;
  }
}

/**
 * Generate a unique quote ID
 */
export function generateQuoteId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
