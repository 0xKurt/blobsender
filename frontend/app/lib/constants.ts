/**
 * Maximum text length for blob messages
 */
export const MAX_TEXT_LENGTH = 1000;

/**
 * Blob size in bytes (EIP-4844 standard)
 */
export const BLOB_SIZE = 131072; // 128 KB

/**
 * Maximum number of retries for operations
 */
export const MAX_RETRIES = 3;

/**
 * Delay between retries in milliseconds
 */
export const RETRY_DELAY_MS = 2000;

/**
 * Escrow contract ABI - only functions we need
 */
export const ESCROW_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: '_id', type: 'bytes32' }],
    name: 'createEscrow',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_id', type: 'bytes32' }],
    name: 'fulfill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'escrows',
    outputs: [
      { internalType: 'uint128', name: 'value', type: 'uint128' },
      { internalType: 'uint64', name: 'timestamp', type: 'uint64' },
      { internalType: 'bool', name: 'fulfilled', type: 'bool' },
      { internalType: 'address', name: 'sender', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

