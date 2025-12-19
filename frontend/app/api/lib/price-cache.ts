/**
 * File-based price quote cache for blob price API
 * This ensures quotes are accessible across different API routes and serverless function invocations
 * Uses filesystem to persist cache across instances
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

interface PriceQuote {
  priceWei: string;
  timestamp: number;
}

interface CacheFile {
  quotes: Record<string, PriceQuote>;
  lastCleanup: number;
}

const QUOTE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

// Cache file path (in .next/cache directory, which is gitignored)
const getCacheFilePath = (): string => {
  // Use process.cwd() to get the project root, then create cache directory
  const cacheDir = join(process.cwd(), '.next', 'cache', 'price-quotes');
  return join(cacheDir, 'quotes.json');
};

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const cacheFilePath = getCacheFilePath();
  const cacheDir = dirname(cacheFilePath);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (error: unknown) {
    // Directory might already exist, that's fine
    if ((error as { code?: string })?.code !== 'EEXIST') {
      console.warn('[price-cache] Could not create cache directory:', error);
    }
  }
}

/**
 * Read cache from file
 */
async function readCache(): Promise<CacheFile> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    const data = await fs.readFile(cacheFilePath, 'utf-8');
    const cache: CacheFile = JSON.parse(data);
    return cache;
  } catch (error: unknown) {
    // File doesn't exist or is invalid, return empty cache
    if ((error as { code?: string })?.code === 'ENOENT') {
      return { quotes: {}, lastCleanup: Date.now() };
    }
    console.warn('[price-cache] Error reading cache file:', error);
    return { quotes: {}, lastCleanup: Date.now() };
  }
}

/**
 * Write cache to file
 */
async function writeCache(cache: CacheFile): Promise<void> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error: unknown) {
    console.error('[price-cache] Error writing cache file:', error);
    throw error;
  }
}

/**
 * Clean up expired quotes
 */
async function cleanupExpiredQuotes(cache: CacheFile): Promise<CacheFile> {
  const now = Date.now();
  const shouldCleanup = now - cache.lastCleanup > CLEANUP_INTERVAL_MS;
  
  if (!shouldCleanup) {
    return cache;
  }

  const expiredIds: string[] = [];
  for (const [quoteId, quote] of Object.entries(cache.quotes)) {
    if (now - quote.timestamp > QUOTE_EXPIRY_MS) {
      expiredIds.push(quoteId);
    }
  }

  for (const id of expiredIds) {
    delete cache.quotes[id];
  }

  cache.lastCleanup = now;

  if (expiredIds.length > 0) {
    console.log(`[price-cache] Cleaned up ${expiredIds.length} expired quotes`);
  }

  return cache;
}

/**
 * Store a price quote with a unique ID
 */
export async function storePriceQuote(quoteId: string, priceWei: string): Promise<void> {
  try {
    const cache = await readCache();
    cache.quotes[quoteId] = {
      priceWei,
      timestamp: Date.now(),
    };
    await writeCache(cache);
    console.log(`[price-cache] Stored quote ID: ${quoteId} for price: ${priceWei} wei`);
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
  try {
    let cache = await readCache();
    cache = await cleanupExpiredQuotes(cache);
    
    const quote = cache.quotes[quoteId];
    if (!quote) {
      const availableIds = Object.keys(cache.quotes);
      console.log(`[price-cache] Quote ID not found: ${quoteId}`);
      console.log(`[price-cache] Available quotes: ${availableIds.length} (${availableIds.slice(0, 5).join(', ')}${availableIds.length > 5 ? '...' : ''})`);
      // Write cleaned cache back
      await writeCache(cache);
      return null;
    }
    
    // Check if quote expired (double-check, cleanup might have missed it)
    const age = Date.now() - quote.timestamp;
    if (age > QUOTE_EXPIRY_MS) {
      console.log(`[price-cache] Quote ID expired: ${quoteId} (age: ${age}ms)`);
      delete cache.quotes[quoteId];
      await writeCache(cache);
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


