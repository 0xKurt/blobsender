import {
  Wallet,
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
 * Prepared blob data with KZG commitment and proof (for off-chain use)
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
    // Fallback padding
    blob = new Uint8Array(BLOB_SIZE);
    blob.set(textBytes);
  }

  // Compute KZG commitment (off-chain)
  const commitmentHex = blobToKzgCommitment(blob);
  const commitment = Uint8Array.from(Buffer.from(commitmentHex.slice(2), 'hex'));

  // Compute KZG proof (off-chain)
  const proofs = computeKzgProofs(blob, commitmentHex);
  const proofHex = Array.isArray(proofs) ? proofs[0] : proofs;
  const proof = Uint8Array.from(Buffer.from(proofHex.slice(2), 'hex'));

  return { blob, commitment, proof };
}

/**
 * Encode escrow fulfill calldata
 */
export function encodeFulfillData(escrowId: string): string {
  const iface = new Interface(ESCROW_ABI);
  return iface.encodeFunctionData('fulfill', [escrowId]);
}

/**
 * Send blob transaction with escrow fulfill
 */
export async function sendBlobTransaction(
  wallet: Wallet,
  contractAddress: string,
  fulfillData: string,
  blobData: PreparedBlobData,
  feeData: { maxFeePerGas: bigint | null; maxPriorityFeePerGas: bigint | null }
): Promise<TransactionResponse> {
  console.log('Sending blob transaction...', { contract: contractAddress });

  // -----------------------------
  // Get blob gas price (EIP-4844)
  // -----------------------------
  let maxFeePerBlobGas: bigint;
  try {
    const provider = wallet.provider as EthersJsonRpcProvider;
    const price = await provider.send('eth_blobGasPrice', []);
    maxFeePerBlobGas = BigInt(price);
  } catch {
    maxFeePerBlobGas = 400_000_000_000n; // fallback: 400 gwei
  }

  // -----------------------------
  // Base gas fees
  // -----------------------------
  const maxFeePerGas = feeData.maxFeePerGas ?? 30n * 10n ** 9n; // 30 gwei
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 2n * 10n ** 9n;

  const baseTxRequest = {
    type: 3 as const, // type-3 transaction (blob)
    to: contractAddress,
    data: fulfillData,
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFeePerBlobGas,
    blobs: [blobData.blob], // ONLY raw blob bytes
  };

  // -----------------------------
  // Estimate gas
  // -----------------------------
  let gasLimit: bigint | undefined;
  try {
    const estimatedGas = await wallet.provider!.estimateGas(baseTxRequest);
    // Small buffer (10%) to avoid underestimation
    gasLimit = (estimatedGas * 110n) / 100n;

    console.log('Estimated gas + buffer:', gasLimit.toString());

    const balance = await wallet.provider!.getBalance(wallet.address);

    // Compute worst-case cost for standard gas (not blob gas!)
    const worstCaseGasCost = gasLimit * maxFeePerGas;

    console.log('Wallet balance:', balance.toString());
    console.log('Worst-case standard gas cost:', worstCaseGasCost.toString());

    if (balance < worstCaseGasCost) {
      throw new Error(
        `Insufficient funds for standard gas: need ${worstCaseGasCost}, have ${balance}`
      );
    }
  } catch (err) {
    console.warn('Gas estimation failed, letting node handle limits:', err);
  }

  const txRequest = gasLimit ? { ...baseTxRequest, gasLimit } : baseTxRequest;

  // -----------------------------
  // Send transaction
  // -----------------------------
  try {
    const tx = await wallet.sendTransaction(txRequest);
    console.log('Blob tx sent:', tx.hash);
    return tx;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('already known') || msg.includes('known transaction')) {
      throw new Error('TRANSACTION_ALREADY_IN_MEMPOOL');
    }
    throw error;
  }
}
