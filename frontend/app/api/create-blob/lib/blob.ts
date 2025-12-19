import {
  Wallet,
  JsonRpcProvider,
  toUtf8Bytes,
  Interface,
  type TransactionResponse,
  type JsonRpcProvider as EthersJsonRpcProvider,
} from 'ethers';

import {
  blobToKzgCommitment,
  computeKzgProofs,
  initializeKzg,
  encodeBlob,
} from '@blobkit/sdk';

import { BLOB_SIZE, ESCROW_ABI } from './constants';

/**
 * Prepared blob data with KZG commitment and proof
 */
export interface PreparedBlobData {
  blob: Uint8Array;
  commitment: Uint8Array;
  proof: Uint8Array;
}

/**
 * Initialize KZG library (idempotent)
 */
export async function initializeKzgLibrary(): Promise<void> {
  try {
    await initializeKzg();
    console.log('KZG initialized successfully');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('already initialized')) {
      console.warn('KZG initialization warning:', msg);
    }
  }
}

/**
 * Prepare blob data: encode text using BlobKit, then compute KZG commitment
 */
export async function prepareBlobData(text: string): Promise<PreparedBlobData> {
  console.log('Preparing blob data...', { textLength: text.length });

  const textBytes = toUtf8Bytes(text);
  console.log('Text bytes length:', textBytes.length);

  if (textBytes.length > BLOB_SIZE) {
    throw new Error(`Text too large for a single blob (${textBytes.length} bytes)`);
  }

  let blob: Uint8Array;

  try {
    blob = encodeBlob(textBytes);
    if (blob.length !== BLOB_SIZE) {
      throw new Error(`Invalid blob size ${blob.length}`);
    }
  } catch {
    // Fallback padding (should never happen, but safe)
    blob = new Uint8Array(BLOB_SIZE);
    blob.set(textBytes);
  }

  const commitmentHex = blobToKzgCommitment(blob);
  const commitment = Uint8Array.from(
    Buffer.from(commitmentHex.slice(2), 'hex')
  );

  const proofs = computeKzgProofs(blob, commitmentHex);
  const proofHex = Array.isArray(proofs) ? proofs[0] : proofs;
  const proof = Uint8Array.from(Buffer.from(proofHex.slice(2), 'hex'));

  return { blob, commitment, proof };
}

/**
 * Send blob transaction with escrow fulfill
 */
export async function sendBlobTransaction(
  wallet: Wallet,
  contractAddress: string,
  fulfillData: string,
  blobData: PreparedBlobData,
  feeData: {
    maxFeePerGas: bigint | null;
    maxPriorityFeePerGas: bigint | null;
  }
): Promise<TransactionResponse> {
  console.log('Sending blob transaction...', {
    contract: contractAddress,
  });

  // -----------------------------
  // Blob gas price (EIP-4844)
  // -----------------------------
  let maxFeePerBlobGas: bigint;

  try {
    const provider = wallet.provider as EthersJsonRpcProvider;
    const price = await provider.send('eth_blobGasPrice', []);
    maxFeePerBlobGas = BigInt(price);
  } catch {
    // Safe fallback
    maxFeePerBlobGas = 400_000_000_000n; // 400 gwei
  }

  // -----------------------------
  // Base fees
  // -----------------------------
  const maxFeePerGas =
    feeData.maxFeePerGas ?? 30n * 10n ** 9n; // 30 gwei

  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas ?? 2n * 10n ** 9n;

  const baseTxRequest = {
    type: 3,
    to: contractAddress,
    data: fulfillData,
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFeePerBlobGas,
    blobs: [
      {
        data: blobData.blob,
        commitment: blobData.commitment,
        proof: blobData.proof,
      },
    ],
  };

  // -----------------------------
  // Balance check (let node handle gas limit)
  // -----------------------------
  try {
    // Calculate approximate total cost for balance check
    // Regular gas: estimate ~100k for simple contract call
    // Blob gas: fixed at 131072 per blob (EIP-4844)
    const ESTIMATED_REGULAR_GAS = 100_000n;
    const BLOB_GAS_PER_BLOB = 131072n;
    
    const estimatedRegularGasCost = ESTIMATED_REGULAR_GAS * maxFeePerGas;
    const blobGasCost = maxFeePerBlobGas * BLOB_GAS_PER_BLOB;
    const estimatedTotalCost = estimatedRegularGasCost + blobGasCost;

    const balance = await wallet.provider!.getBalance(wallet.address);
    
    console.log('Balance check:', {
      balance: balance.toString(),
      estimatedTotalCost: estimatedTotalCost.toString(),
      estimatedTotalCostEth: (Number(estimatedTotalCost) / 1e18).toFixed(6),
    });

    if (balance < estimatedTotalCost) {
      const shortfall = estimatedTotalCost - balance;
      throw new Error(
        `Insufficient funds. Estimated need: ${(Number(estimatedTotalCost) / 1e18).toFixed(6)} ETH ` +
        `(have ${(Number(balance) / 1e18).toFixed(6)} ETH, shortfall: ${(Number(shortfall) / 1e18).toFixed(6)} ETH)`
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('Insufficient funds')) {
      throw err; // Re-throw our custom error
    }
    console.warn('Balance check failed, proceeding anyway:', errorMessage);
  }

  // Don't set gasLimit - let node estimate automatically
  const txRequest = baseTxRequest;

  // -----------------------------
  // Send tx
  // -----------------------------
  try {
    const tx = await wallet.sendTransaction(txRequest);
    console.log('Blob tx sent:', tx.hash);
    return tx;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);

    if (
      msg.includes('already known') ||
      msg.includes('known transaction')
    ) {
      throw new Error('TRANSACTION_ALREADY_IN_MEMPOOL');
    }

    throw error;
  }
}

/**
 * Encode escrow fulfill calldata
 */
export function encodeFulfillData(escrowId: string): string {
  const iface = new Interface(ESCROW_ABI);
  return iface.encodeFunctionData('fulfill', [escrowId]);
}
