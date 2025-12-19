import { type Address } from 'viem';

/**
 * Server-side configuration loaded from environment variables
 * All chain-specific settings are configurable via env vars
 */
export interface ServerConfig {
  rpcUrl: string;
  privateKey: string;
  escrowAddress: Address;
  chainId: number;
  etherscanUrl: string;
  blobscanUrl: string;
  withdrawDelayMinutes: number;
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

function validateUrl(url: string, name: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid ${name} URL: ${url}`);
  }
}

function validatePrivateKey(key: string): string {
  // Basic validation - private key should be hex string
  if (!/^0x[a-fA-F0-9]{64}$/.test(key) && !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error('Invalid private key format');
  }
  return key.startsWith('0x') ? key : `0x${key}`;
}

function validateWithdrawDelay(delay: string): number {
  const minutes = parseInt(delay, 10);
  if (isNaN(minutes) || minutes < 0) {
    throw new Error(`Invalid withdraw delay: ${delay}`);
  }
  return minutes;
}

/**
 * Get server configuration from environment variables
 * Validates all required values are present and properly formatted
 */
export function getServerConfig(): ServerConfig {
  try {
    const rpcUrl = validateUrl(getEnvVar('RPC_URL'), 'RPC');
    const privateKey = validatePrivateKey(getEnvVar('PRIVATE_KEY'));
    const escrowAddress = validateAddress(getEnvVar('ESCROW_ADDRESS'));
    const chainId = validateChainId(getEnvVar('CHAIN_ID'));
    const etherscanUrl = validateUrl(getEnvVar('ETHERSCAN_URL'), 'Etherscan');
    const blobscanUrl = validateUrl(getEnvVar('BLOBSCAN_URL'), 'Blobscan');
    const withdrawDelayMinutes = validateWithdrawDelay(
      getEnvVar('WITHDRAW_DELAY_MINUTES')
    );

    return {
      rpcUrl,
      privateKey,
      escrowAddress,
      chainId,
      etherscanUrl,
      blobscanUrl,
      withdrawDelayMinutes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load server configuration: ${message}`);
  }
}

// Export singleton config instance (lazy load to avoid build-time errors)
let _serverConfig: ServerConfig | null = null;

export function getServerConfigInstance(): ServerConfig {
  if (!_serverConfig) {
    _serverConfig = getServerConfig();
  }
  return _serverConfig;
}

// For server-side usage, validate at runtime
export const serverConfig = typeof window === 'undefined' ? getServerConfigInstance() : ({} as ServerConfig);

