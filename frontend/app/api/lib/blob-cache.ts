/**
 * File-based blob cache for storing recent blob creations
 * This ensures blobs are accessible across different API routes and serverless function invocations
 * Uses filesystem to persist cache across instances
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface BlobCacheEntry {
  creator: string;
  message: string; // Full message (not shortened)
  blobscanLink: string;
  date: string;
  escrowId: string;
}

const MAX_BLOBS = 50;
const MAX_AGE_DAYS = 18;

// Cache file path (in .next/cache directory, which is gitignored)
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
    // Directory might already exist, that's fine
    if ((error as { code?: string })?.code !== 'EEXIST') {
      console.warn('[blob-cache] Could not create cache directory:', error);
    }
  }
}

/**
 * Read blob cache from file
 */
export async function readBlobCache(): Promise<BlobCacheEntry[]> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    const data = await fs.readFile(cacheFilePath, 'utf-8');
    const cache: BlobCacheEntry[] = JSON.parse(data);
    return Array.isArray(cache) ? cache : [];
  } catch (error: unknown) {
    // File doesn't exist or is invalid, return empty cache
    if ((error as { code?: string })?.code === 'ENOENT') {
      return [];
    }
    console.warn('[blob-cache] Error reading cache file:', error);
    return [];
  }
}

/**
 * Write blob cache to file
 */
async function writeBlobCache(blobs: BlobCacheEntry[]): Promise<void> {
  try {
    await ensureCacheDir();
    const cacheFilePath = getCacheFilePath();
    await fs.writeFile(cacheFilePath, JSON.stringify(blobs, null, 2), 'utf-8');
  } catch (error: unknown) {
    console.error('[blob-cache] Error writing cache file:', error);
    throw error;
  }
}

/**
 * Add a new blob to the cache (keeps only last MAX_BLOBS, removes oldest if exceeded)
 */
export async function addBlobToCache(blob: BlobCacheEntry): Promise<void> {
  try {
    const cache = await readBlobCache();
    // Add new blob at the beginning
    cache.unshift(blob);
    
    // Filter out blobs older than MAX_AGE_DAYS
    const now = Date.now();
    const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const filteredCache = cache.filter((entry) => {
      const entryDate = new Date(entry.date).getTime();
      const age = now - entryDate;
      return age <= maxAgeMs;
    });
    
    // Keep only last MAX_BLOBS (remove oldest if exceeded)
    const trimmedCache = filteredCache.slice(0, MAX_BLOBS);
    
    // If we removed any blobs, log it
    if (cache.length > trimmedCache.length) {
      const removed = cache.length - trimmedCache.length;
      console.log(`[blob-cache] Removed ${removed} old blob(s) from cache (max: ${MAX_BLOBS}, age limit: ${MAX_AGE_DAYS} days)`);
    }
    
    await writeBlobCache(trimmedCache);
    console.log(`[blob-cache] Added blob to cache (total: ${trimmedCache.length})`);
  } catch (error: unknown) {
    console.error('[blob-cache] Error adding blob to cache:', error);
    throw error;
  }
}

/**
 * Get all cached blobs, filtered by age (max 18 days old)
 */
export async function getCachedBlobs(): Promise<BlobCacheEntry[]> {
  const cache = await readBlobCache();
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // 18 days in milliseconds
  
  // Filter out blobs older than 18 days
  const filtered = cache.filter((blob) => {
    const blobDate = new Date(blob.date).getTime();
    const age = now - blobDate;
    return age <= maxAgeMs;
  });
  
  // Keep only last MAX_BLOBS
  return filtered.slice(0, MAX_BLOBS);
}

