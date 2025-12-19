import { type Address } from 'viem';

/**
 * Success response after blob creation
 */
export interface BlobSuccess {
  blobscanLink: string;
  etherscanLink: string;
  escrowId: string;
}

/**
 * Withdrawal information when escrow creation succeeds but fulfillment fails
 */
export interface WithdrawInfo {
  escrowId: string;
  escrowTxHash: string;
  withdrawDelay: number;
  details?: string;
  expectedValue?: string;
  actualValue?: string;
  etherscanLink?: string;
  contractLink?: string;
}

/**
 * Recent blob entry in cache
 */
export interface RecentBlob {
  creator: string;
  message: string;
  blobscanLink: string;
  date: string;
  escrowId: string;
}

/**
 * Escrow data from contract
 */
export interface EscrowData {
  value: bigint;
  timestamp: bigint;
  fulfilled: boolean;
  sender: Address;
}

/**
 * Request body for create-blob API
 */
export interface CreateBlobRequest {
  text: string;
  userAddress: Address;
  escrowTxHash: string;
  escrowId: string;
  quoteId: string; // Quote ID from blob-price API (not the price itself - security)
}

/**
 * Response from create-blob API (success)
 */
export interface CreateBlobSuccessResponse {
  success: true;
  escrowId: string;
  blobTxHash: string;
  blobscanLink: string;
  etherscanLink: string;
}

/**
 * Response from create-blob API (error with withdrawal option)
 */
export interface CreateBlobErrorResponse {
  error: string;
  escrowId?: string;
  escrowTxHash?: string;
  blobTxHash?: string;
  canWithdraw?: boolean;
  withdrawDelay?: number;
  details?: string;
  expectedValue?: string;
  actualValue?: string;
  etherscanLink?: string;
  contractLink?: string;
}

/**
 * Blob price response
 */
export interface BlobPriceResponse {
  price: number;
  priceWei: string;
  blobGasPrice: string;
  blobGasUsed: string;
  feeData: {
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
  };
  quoteId: string; // Quote ID to send back to backend for verification
}

