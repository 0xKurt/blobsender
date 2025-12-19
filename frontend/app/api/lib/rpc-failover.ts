import { JsonRpcProvider, type JsonRpcProvider as EthersJsonRpcProvider } from 'ethers';

/**
 * RPC failover utility
 * Tries multiple RPC endpoints in sequence until one works
 */

interface RpcHealthCheck {
  url: string;
  lastSuccess: number | null;
  consecutiveFailures: number;
}

// Cache for RPC health status
const rpcHealthCache = new Map<string, RpcHealthCheck>();

// Timeout for RPC calls (5 seconds)
const RPC_TIMEOUT_MS = 5000;

/**
 * Test if an RPC endpoint is working by making a simple call
 */
async function testRpc(provider: JsonRpcProvider, url: string): Promise<boolean> {
  try {
    // Use Promise.race to implement timeout
    const testPromise = provider.getBlockNumber();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('RPC timeout')), RPC_TIMEOUT_MS);
    });

    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.warn(`[RPC Failover] RPC ${url} failed health check:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Get a working RPC provider from a list of URLs
 * Tries each RPC in sequence until one works
 * Caches successful RPCs to avoid unnecessary retries
 * 
 * @param rpcUrls - Array of RPC URLs to try
 * @param chainId - Chain ID to use (prevents auto-detection and related errors)
 */
export async function getWorkingRpcProvider(
  rpcUrls: string[],
  chainId?: number
): Promise<{ provider: EthersJsonRpcProvider; url: string }> {
  if (rpcUrls.length === 0) {
    throw new Error('No RPC URLs provided');
  }

  // Suppress ethers.js network detection console errors
  // These errors are harmless but noisy - we handle RPC selection ourselves
  const originalConsoleError = console.error;
  const suppressedMessages = [
    'JsonRpcProvider failed to detect network',
    'cannot start up; retry in',
  ];
  
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : String(args[0]);
    // Only suppress network detection errors, allow other errors through
    if (!suppressedMessages.some((msg) => message.includes(msg))) {
      originalConsoleError.apply(console, args);
    }
  };

  try {
    // Initialize health cache for new URLs
    for (const url of rpcUrls) {
      if (!rpcHealthCache.has(url)) {
        rpcHealthCache.set(url, {
          url,
          lastSuccess: null,
          consecutiveFailures: 0,
        });
      }
    }

    // Sort RPCs by health (prefer recently successful ones, avoid ones with many failures)
    const sortedRpcUrls = [...rpcUrls].sort((a, b) => {
      const healthA = rpcHealthCache.get(a)!;
      const healthB = rpcHealthCache.get(b)!;

      // Prefer RPCs that succeeded recently
      if (healthA.lastSuccess && !healthB.lastSuccess) return -1;
      if (!healthA.lastSuccess && healthB.lastSuccess) return 1;
      if (healthA.lastSuccess && healthB.lastSuccess) {
        return healthB.lastSuccess - healthA.lastSuccess; // More recent first
      }

      // Prefer RPCs with fewer consecutive failures
      return healthA.consecutiveFailures - healthB.consecutiveFailures;
    });

    // Try each RPC in order
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of sortedRpcUrls) {
      // Create provider with explicit network to avoid auto-detection
      // Pass network as second parameter, options as third
      const network = chainId ? { chainId, name: 'unknown' } : undefined;
      const provider = new JsonRpcProvider(url, network, { polling: false });
      
      const health = rpcHealthCache.get(url)!;

      console.log(`[RPC Failover] Trying RPC: ${url} (failures: ${health.consecutiveFailures})`);

      try {
        const isWorking = await testRpc(provider, url);

        if (isWorking) {
          // Success - update health cache
          health.lastSuccess = Date.now();
          health.consecutiveFailures = 0;
          console.log(`[RPC Failover] ✅ RPC ${url} is working`);
          return { provider, url };
        } else {
          // Failed health check
          health.consecutiveFailures++;
          errors.push({ url, error: 'Health check failed' });
        }
      } catch (error) {
        // RPC call failed
        health.consecutiveFailures++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ url, error: errorMessage });
        console.warn(`[RPC Failover] ❌ RPC ${url} failed: ${errorMessage}`);
      }
    }

    // All RPCs failed
    const errorDetails = errors.map((e) => `  - ${e.url}: ${e.error}`).join('\n');
    throw new Error(
      `All RPC endpoints failed. Tried ${rpcUrls.length} endpoint(s):\n${errorDetails}`
    );
  } finally {
    // Restore original console.error
    console.error = originalConsoleError;
  }
}

/**
 * Parse comma-separated RPC URLs from environment variable
 */
export function parseRpcUrls(envValue: string | undefined): string[] {
  if (!envValue) {
    throw new Error('RPC_URL environment variable is required');
  }

  const urls = envValue
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  if (urls.length === 0) {
    throw new Error('No valid RPC URLs found in RPC_URL environment variable');
  }

  return urls;
}

/**
 * Get a working RPC provider from environment variable (supports comma-separated URLs)
 */
export async function getRpcProviderFromEnv(envVarName: string = 'RPC_URL'): Promise<{
  provider: EthersJsonRpcProvider;
  url: string;
}> {
  const envValue = process.env[envVarName];
  const rpcUrls = parseRpcUrls(envValue);
  return getWorkingRpcProvider(rpcUrls);
}

