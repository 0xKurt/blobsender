import { type Address } from 'viem';

export interface ChainConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  escrowAddress: Address;
  etherscanUrl: string;
  blobscanUrl: string;
}

function validateAddress(address: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }
  return address as Address;
}

function validateChainId(chainId: string): number {
  const id = parseInt(chainId, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return id;
}

function validateUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Get chain configuration from environment variables
 * Note: NEXT_PUBLIC_ variables must be accessed directly (not via dynamic property access)
 */
export function getChainConfig(): ChainConfig {
  const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  const etherscanUrl = process.env.NEXT_PUBLIC_ETHERSCAN_URL;
  const blobscanUrl = process.env.NEXT_PUBLIC_BLOBSCAN_URL;

  if (!chainIdStr || !chainName || !rpcUrl || !escrowAddress || !etherscanUrl || !blobscanUrl) {
    throw new Error('Missing required NEXT_PUBLIC_ environment variables');
  }

  return {
    chainId: validateChainId(chainIdStr),
    chainName,
    rpcUrl: validateUrl(rpcUrl),
    escrowAddress: validateAddress(escrowAddress),
    etherscanUrl: validateUrl(etherscanUrl),
    blobscanUrl: validateUrl(blobscanUrl),
  };
}

let _chainConfig: ChainConfig | null = null;

export function getChainConfigInstance(): ChainConfig {
  if (!_chainConfig) {
    if (typeof window === 'undefined') {
      throw new Error('Chain config can only be loaded on the client side');
    }
    _chainConfig = getChainConfig();
  }
  return _chainConfig;
}

