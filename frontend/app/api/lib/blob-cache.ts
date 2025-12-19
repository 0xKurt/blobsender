/**
 * Upstash Redis-based blob cache for storing recent blobs
 * Uses Upstash Redis for persistence in serverless environments
 */

import { getRedisClient, isUpstashConfigured } from './upstash';

export interface BlobCacheEntry {
  creator: string;
  message: string; // Full message (not shortened)
  blobscanLink: string;
  date: string;
  escrowId: string;
}

const MAX_BLOBS = 50;
const MAX_AGE_DAYS = 18;
const REDIS_KEY = 'blobs:cache';

/**
 * Filter and trim cache according to limits
 */
function filterAndTrimCache(cache: BlobCacheEntry[]): BlobCacheEntry[] {
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  
  // Filter by age
  const filtered = cache.filter((entry) => {
    const entryDate = new Date(entry.date).getTime();
    const age = now - entryDate;
    return age <= maxAgeMs;
  });
  
  // Trim to MAX_BLOBS
  return filtered.slice(0, MAX_BLOBS);
}

/**
 * Add a new blob to the cache
 */
export async function addBlobToCache(blob: BlobCacheEntry): Promise<void> {
  if (!isUpstashConfigured()) {
    // Blob caching is not critical, so we just log a warning and continue
    console.warn('[blob-cache] Upstash not configured, blob will not be cached');
    return;
  }

  try {
    const redis = getRedisClient();
    
    // Get existing cache
    let cache = await redis.get<BlobCacheEntry[]>(REDIS_KEY);
    if (!Array.isArray(cache)) {
      cache = [];
    }
    
    // Add new blob at the beginning
    const updatedCache = [blob, ...cache];
    
    // Filter and trim
    const trimmedCache = filterAndTrimCache(updatedCache);
    
    // Calculate removed count
    const removed = updatedCache.length - trimmedCache.length;
    
    // Save to Redis
    await redis.set(REDIS_KEY, trimmedCache);
    
    if (removed > 0) {
      console.log(`[blob-cache] Removed ${removed} old blob(s) from cache`);
    }
    
    console.log(`[blob-cache] Added blob to cache (total: ${trimmedCache.length})`);
  } catch (error: unknown) {
    console.error('[blob-cache] Error adding blob to cache:', error);
    // Don't throw - caching is not critical for functionality
  }
}

/**
 * Get all cached blobs
 */
export async function getCachedBlobs(): Promise<BlobCacheEntry[]> {
  if (!isUpstashConfigured()) {
    console.warn('[blob-cache] Upstash not configured, returning empty cache');
    return [];
  }

  try {
    const redis = getRedisClient();
    const cache = await redis.get<BlobCacheEntry[]>(REDIS_KEY);
    
    if (!Array.isArray(cache)) {
      return [];
    }
    
    // Return filtered/trimmed cache
    return filterAndTrimCache(cache);
  } catch (error: unknown) {
    console.error('[blob-cache] Error getting cached blobs:', error);
    return [];
  }
}
