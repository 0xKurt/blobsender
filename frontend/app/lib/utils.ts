import { getChainConfigInstance } from './config';

/**
 * Generate a random bytes32 escrow ID
 */
export function generateEscrowId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Shorten Ethereum address for display
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format date string for short display (table view)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For older dates, show month/day
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get Etherscan URL for transaction or address
 */
export function getExplorerUrl(type: 'tx' | 'address', hash: string): string {
  const config = getChainConfigInstance();
  return `${config.etherscanUrl}/${type}/${hash}`;
}

/**
 * Get Blobscan URL for blob hash
 */
export function getBlobscanUrl(blobHash: string): string {
  const config = getChainConfigInstance();
  return `${config.blobscanUrl}/blob/${blobHash}`;
}

