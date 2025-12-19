'use client';

import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { getChainConfigInstance } from './config';

/**
 * Create wagmi chain configuration from environment variables
 */
function createWagmiChain(config: ReturnType<typeof getChainConfigInstance>) {
  return defineChain({
    id: config.chainId,
    name: config.chainName,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [config.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: config.etherscanUrl,
      },
    },
  });
}

let _wagmiConfig: ReturnType<typeof createConfig> | null = null;

/**
 * Get wagmi configuration (lazy load to avoid build-time errors)
 * Only call this on the client side
 */
export function getWagmiConfig() {
  if (!_wagmiConfig) {
    // Only load on client side
    if (typeof window === 'undefined') {
      throw new Error('Wagmi config can only be created on the client side');
    }
    // Use static import - Next.js will embed NEXT_PUBLIC_ vars at build time
    const config = getChainConfigInstance();
    _wagmiConfig = createConfig({
      chains: [createWagmiChain(config)],
      connectors: [injected()],
      transports: {
        [config.chainId]: http(config.rpcUrl, {
          batch: true, // Batch multiple requests together
          retryCount: 1, // Reduce retry attempts
        }),
      },
      // Reduce polling frequency
      pollingInterval: 30000, // Poll every 30 seconds instead of default (usually 4 seconds)
    });
  }
  return _wagmiConfig;
}

/**
 * Wagmi configuration using chain settings from environment
 * This is a placeholder that will be replaced at runtime
 */
export const wagmiConfig = createConfig({
  chains: [defineChain({ 
    id: 1, 
    name: 'Ethereum', 
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, 
    rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } }, 
    blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } } 
  })],
  connectors: [injected()],
  transports: { 1: http('https://eth.llamarpc.com') },
});

