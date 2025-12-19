/**
 * Hybrid blob cache: Local cache for speed, Upstash Redis for persistence
 * Only writes to Upstash when blob is published to minimize API calls
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
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

// Local file cache (primary storage, synced with Upstash)
const getCacheFilePath = (): string => {
  const cacheDir = join(process.cwd(), '.next', 'cache', 'blobs');
  return join(cacheDir, 'blobs.json');
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
    if ((error as { code?: string })?.code !== 'EEXIST') {
      console.warn('[blob-cache] Could not create cache directory:', error);
    }
  }
}

/**
 * Read from local file cache (fallback)
 */
async function readLocalFileCache(): Promise<BlobCacheEntry[]> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    const data = await fs.readFile(cacheFilePath, 'utf-8');
    const cache: BlobCacheEntry[] = JSON.parse(data);
    return Array.isArray(cache) ? cache : [];
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      return [];
    }
    console.warn('[blob-cache] Error reading local file cache:', error);
    return [];
  }
}

/**
 * Write to local file cache (backup)
 */
async function writeLocalFileCache(blobs: BlobCacheEntry[]): Promise<void> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    await fs.writeFile(cacheFilePath, JSON.stringify(blobs, null, 2), 'utf-8');
  } catch (error: unknown) {
    console.warn('[blob-cache] Error writing local file cache:', error);
  }
}

/**
 * Load cache from Upstash (only called once on startup or when local cache is empty)
 */
async function loadFromUpstash(): Promise<BlobCacheEntry[]> {
  if (!isUpstashConfigured()) {
    console.log('[blob-cache] Upstash not configured, using local cache only');
    return readLocalFileCache();
  }

  try {
    const redis = getRedisClient();
    const data = await redis.get<BlobCacheEntry[]>('blobs:cache');
    
    if (Array.isArray(data)) {
      console.log(`[blob-cache] Loaded ${data.length} blobs from Upstash`);
      return data;
    }
    
    // If Upstash is empty, try local file as fallback
    return readLocalFileCache();
  } catch (error: unknown) {
    console.warn('[blob-cache] Error loading from Upstash, using local cache:', error);
    return readLocalFileCache();
  }
}

/**
 * Save cache to Upstash (only when blob is published)
 */
async function saveToUpstash(blobs: BlobCacheEntry[]): Promise<void> {
  if (!isUpstashConfigured()) {
    // If Upstash not configured, just save to local file
    await writeLocalFileCache(blobs);
    return;
  }

  try {
    const redis = getRedisClient();
    await redis.set('blobs:cache', blobs);
    console.log(`[blob-cache] Saved ${blobs.length} blobs to Upstash`);
    
    // Also update local file as backup
    await writeLocalFileCache(blobs);
  } catch (error: unknown) {
    console.error('[blob-cache] Error saving to Upstash:', error);
    // Fallback to local file if Upstash fails
    await writeLocalFileCache(blobs);
  }
}

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
 * Writes to local file immediately, syncs to Upstash when blob is published
 */
export async function addBlobToCache(blob: BlobCacheEntry): Promise<void> {
  // Read from local file (not in-memory)
  const cache = await readLocalFileCache();
  
  // Add new blob at the beginning
  const updatedCache = [blob, ...cache];
  
  // Filter and trim
  const trimmedCache = filterAndTrimCache(updatedCache);
  
  // Calculate removed count
  const removed = updatedCache.length - trimmedCache.length;
  
  // Write to local file immediately (fast)
  await writeLocalFileCache(trimmedCache);
  
  // Sync to Upstash (this is the only Upstash write - when blob is published)
  await saveToUpstash(trimmedCache);
  
  if (removed > 0) {
    console.log(`[blob-cache] Removed ${removed} old blob(s) from cache`);
  }
  
  console.log(`[blob-cache] Added blob to cache (total: ${trimmedCache.length})`);
}

/**
 * Get all cached blobs
 * Always reads from local file first (fast), only loads from Upstash if file is empty (first startup)
 */
export async function getCachedBlobs(): Promise<BlobCacheEntry[]> {
  // Always read from local file first
  let cache = await readLocalFileCache();
  
  // Only if file is empty AND Upstash is configured, load from Upstash once
  if (cache.length === 0 && isUpstashConfigured()) {
    console.log('[blob-cache] Local file cache is empty, loading from Upstash (first startup)');
    cache = await loadFromUpstash();
    
    // Save to local file for future reads
    if (cache.length > 0) {
      await writeLocalFileCache(cache);
      console.log(`[blob-cache] Loaded ${cache.length} blobs from Upstash and saved to local file`);
    }
  }
  
  // Return filtered/trimmed cache
  return filterAndTrimCache(cache);
}
