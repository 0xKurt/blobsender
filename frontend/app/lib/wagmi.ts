'use client';

import { createConfig, http } from 'wagmi';
import { getDefaultConfig } from 'connectkit';
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
    const chain = createWagmiChain(config);
    
    // Use ConnectKit's getDefaultConfig which automatically includes:
    // - WalletConnect
    // - MetaMask
    // - Coinbase Wallet
    // - EIP-6963 injected wallets (auto-detected)
    const ckConfig = getDefaultConfig({
      chains: [chain],
      transports: {
        [config.chainId]: http(config.rpcUrl, {
          batch: true, // Batch multiple requests together
          retryCount: 1, // Reduce retry attempts
        }),
      },
      walletConnectProjectId: '1d20028a1dcc5203f921fbac69e4ad12',
      appName: 'BlobSender',
      appDescription: 'Create and share blobs on Ethereum using EIP-4844',
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://blobsender.xyz',
      appIcon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined,
    });
    
    _wagmiConfig = createConfig(ckConfig);
  }
  return _wagmiConfig;
}


