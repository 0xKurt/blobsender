import { Contract, type TransactionReceipt, type JsonRpcProvider } from 'ethers';
import type { EscrowData } from '../../../types';
import { serverConfig } from './config';

/**
 * Result of escrow verification
 */
export interface EscrowVerificationResult {
  valid: boolean;
  escrowData?: EscrowData;
  error?: string;
}

/**
 * Verify escrow exists and retrieve its data
 */
export async function verifyEscrowExists(
  contract: Contract,
  escrowId: string
): Promise<EscrowVerificationResult> {
  try {
    const escrowData = await contract.escrows(escrowId);
    
    // Check if escrow exists (sender will be zero address if not)
    if (!escrowData || escrowData.sender === '0x0000000000000000000000000000000000000000') {
      return {
        valid: false,
        error: 'Escrow does not exist',
      };
    }

    return {
      valid: true,
      escrowData: {
        value: BigInt(escrowData.value.toString()),
        timestamp: BigInt(escrowData.timestamp.toString()),
        fulfilled: escrowData.fulfilled,
        sender: escrowData.sender,
      },
    };
  } catch (error) {
    console.error('Error verifying escrow exists:', error);
    return {
      valid: false,
      error: `Failed to read escrow data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify escrow sender matches expected sender
 */
export function verifyEscrowSender(
  escrowData: EscrowData,
  expectedSender: string
): { valid: boolean; error?: string } {
  if (escrowData.sender.toLowerCase() !== expectedSender.toLowerCase()) {
    return {
      valid: false,
      error: `Escrow sender mismatch: expected ${expectedSender}, got ${escrowData.sender}`,
    };
  }
  return { valid: true };
}

/**
 * Verify escrow is not already fulfilled
 */
export function verifyEscrowNotFulfilled(
  escrowData: EscrowData
): { valid: boolean; error?: string } {
  if (escrowData.fulfilled) {
    return {
      valid: false,
      error: 'Escrow already fulfilled',
    };
  }
  return { valid: true };
}

/**
 * Verify escrow value is greater than zero
 */
export function verifyEscrowValue(
  escrowData: EscrowData
): { valid: boolean; error?: string } {
  if (escrowData.value === 0n) {
    return {
      valid: false,
      error: 'Escrow has zero value',
    };
  }
  return { valid: true };
}

/**
 * CRITICAL SECURITY FUNCTION: Verify escrow balance matches expected value
 * This prevents wallet draining by ensuring we only fulfill escrows with the correct amount
 */
export async function verifyEscrowBalance(
  contract: Contract,
  escrowId: string,
  expectedValue: bigint
): Promise<{ valid: boolean; actualValue?: bigint; error?: string }> {
  try {
    const escrowData = await contract.escrows(escrowId);
    const actualValue = BigInt(escrowData.value.toString());

    console.log('Escrow balance verification:', {
      escrowId,
      expectedValue: expectedValue.toString(),
      actualValue: actualValue.toString(),
      match: actualValue === expectedValue,
    });

    if (actualValue !== expectedValue) {
      return {
        valid: false,
        actualValue,
        error: `Price mismatch: expected ${expectedValue.toString()} wei, but escrow has ${actualValue.toString()} wei`,
      };
    }

    return { valid: true, actualValue };
  } catch (error) {
    console.error('Error verifying escrow balance:', error);
    return {
      valid: false,
      error: `Failed to verify escrow balance: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Comprehensive escrow security verification
 * Combines all security checks into one function
 */
export async function verifyEscrowSecurity(
  contract: Contract,
  escrowId: string,
  userAddress: string,
  expectedValue: bigint
): Promise<{
  valid: boolean;
  escrowData?: EscrowData;
  error?: string;
  actualValue?: bigint;
}> {
  // Step 1: Verify escrow exists
  const existsResult = await verifyEscrowExists(contract, escrowId);
  if (!existsResult.valid || !existsResult.escrowData) {
    return {
      valid: false,
      error: existsResult.error || 'Escrow does not exist',
    };
  }

  const escrowData = existsResult.escrowData;

  // Step 2: Verify sender matches
  const senderResult = verifyEscrowSender(escrowData, userAddress);
  if (!senderResult.valid) {
    return {
      valid: false,
      escrowData,
      error: senderResult.error,
    };
  }

  // Step 3: Verify not already fulfilled
  const fulfilledResult = verifyEscrowNotFulfilled(escrowData);
  if (!fulfilledResult.valid) {
    return {
      valid: false,
      escrowData,
      error: fulfilledResult.error,
    };
  }

  // Step 4: Verify value > 0
  const valueResult = verifyEscrowValue(escrowData);
  if (!valueResult.valid) {
    return {
      valid: false,
      escrowData,
      error: valueResult.error,
    };
  }

  // Step 5: CRITICAL - Verify balance matches expected value
  const balanceResult = await verifyEscrowBalance(contract, escrowId, expectedValue);
  if (!balanceResult.valid) {
    return {
      valid: false,
      escrowData,
      actualValue: balanceResult.actualValue,
      error: balanceResult.error,
    };
  }

  // All checks passed
  return {
    valid: true,
    escrowData,
  };
}

/**
 * Wait for escrow transaction to be confirmed
 */
export async function waitForEscrowTransaction(
  provider: JsonRpcProvider,
  txHash: string,
  maxRetries: number = 6,
  delay: number = 2000
): Promise<TransactionReceipt> {
  const { retryOperation } = await import('./utils');
  
  const receipt = await retryOperation(
    async () => {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction not found yet');
      }
      return receipt;
    },
    maxRetries,
    delay
  );

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction failed or reverted');
  }

  return receipt;
}

