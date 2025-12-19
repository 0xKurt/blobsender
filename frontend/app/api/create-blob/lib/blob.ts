import { Wallet, JsonRpcProvider, toUtf8Bytes, Interface, type TransactionResponse, type JsonRpcProvider as EthersJsonRpcProvider } from 'ethers';
import { blobToKzgCommitment, computeKzgProofs, initializeKzg, encodeBlob } from '@blobkit/sdk';
import { BLOB_SIZE, ESCROW_ABI } from './constants';
import { serverConfig } from './config';

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('already initialized')) {
      console.warn('KZG initialization warning:', errorMessage);
    }
  }
}

/**
 * Prepare blob data: encode text using BlobKit, then compute KZG commitment
 */
export async function prepareBlobData(text: string): Promise<PreparedBlobData> {
  console.log('Preparing blob data...', { textLength: text.length });

  // Convert text to UTF-8 bytes
  const textBytes = toUtf8Bytes(text);
  console.log('Text bytes length:', textBytes.length);

  if (textBytes.length > BLOB_SIZE) {
    throw new Error(`Text too large for a single blob (${textBytes.length} bytes)`);
  }

  // Encode blob using BlobKit (required for KZG computation)
  let blob: Uint8Array;
  try {
    blob = encodeBlob(textBytes);
    console.log('Blob encoded using BlobKit, size:', blob.length);
    
    if (blob.length !== BLOB_SIZE) {
      throw new Error(`Invalid blob size: expected ${BLOB_SIZE} bytes, got ${blob.length}`);
    }
  } catch (error: unknown) {
    console.error('Error encoding blob with BlobKit:', error);
    // Fallback: manually pad if encodeBlob fails
    console.log('Falling back to manual padding...');
    blob = new Uint8Array(BLOB_SIZE);
    blob.set(textBytes, 0);
    console.log('Blob manually padded to', blob.length, 'bytes');
  }

  // Compute KZG commitment (blob must be properly encoded)
  const commitmentHex = blobToKzgCommitment(blob);
  const commitment = new Uint8Array(
    Buffer.from(commitmentHex.replace('0x', ''), 'hex')
  );

  console.log('Commitment computed');

  // Compute KZG proof
  const proofsArray = computeKzgProofs(blob, commitmentHex);
  const proofHex = Array.isArray(proofsArray) ? proofsArray[0] : proofsArray;
  const proof = new Uint8Array(
    Buffer.from(proofHex.replace('0x', ''), 'hex')
  );

  console.log('Proof computed');

  return { blob, commitment, proof };
}


/**
 * Send blob transaction with fulfill escrow contract call
 */
export async function sendBlobTransaction(
  wallet: Wallet,
  contractAddress: string,
  fulfillData: string,
  blobData: PreparedBlobData,
  feeData: { maxFeePerGas: bigint | null; maxPriorityFeePerGas: bigint | null }
): Promise<TransactionResponse> {
  console.log('Sending blob transaction with fulfill escrow call...', {
    contract: contractAddress,
    blobSize: blobData.blob.length,
  });

  // Get blob gas price from RPC (EIP-4844 standard)
  let maxFeePerBlobGas: bigint;
  try {
    if (wallet.provider && 'send' in wallet.provider) {
      const provider = wallet.provider as EthersJsonRpcProvider;
      const blobGasPrice = await provider.send('eth_blobGasPrice', []);
      maxFeePerBlobGas = BigInt(blobGasPrice as string);
      console.log('Blob gas price from RPC:', maxFeePerBlobGas.toString());
    } else {
      throw new Error('Provider does not support send method');
    }
  } catch {
    // Fallback to default if RPC doesn't support eth_blobGasPrice
    maxFeePerBlobGas = 400_000_000_000n; // 400 gwei
    console.log(
      'Using default blob gas price:',
      maxFeePerBlobGas.toString(),
      '(RPC doesn\'t support eth_blobGasPrice)'
    );
  }

  // Build transaction request
  const maxFeePerGas = feeData.maxFeePerGas ?? 30n * 10n ** 9n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 2n * 10n ** 9n;
  
  const baseTxRequest = {
    type: 3, // Blob transaction type
    to: contractAddress, // Contract address - blob + contract call
    data: fulfillData, // Encoded fulfill function call data
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFeePerBlobGas: maxFeePerBlobGas,
    blobs: [{ data: blobData.blob, commitment: blobData.commitment, proof: blobData.proof }],
  };

  // Estimate gas and check balance before sending
  let estimatedGas: bigint | undefined;
  try {
    console.log('Estimating gas for blob transaction...');
    const rawEstimatedGas = await wallet.provider!.estimateGas(baseTxRequest);
    console.log('Raw estimated gas:', rawEstimatedGas.toString());

    // Apply 1.5x buffer to gas limit for safety margin (accounts for gas price fluctuations)
    const GAS_BUFFER_MULTIPLIER = 150n; // 1.5x = 150%
    estimatedGas = (rawEstimatedGas * GAS_BUFFER_MULTIPLIER) / 100n;
    console.log('Estimated gas with 1.5x buffer:', estimatedGas.toString());

    // Calculate total cost: regular gas + blob gas
    // Blob gas is fixed at 131072 per blob (EIP-4844)
    const BLOB_GAS_PER_BLOB = 131072n;
    const blobGasCost = maxFeePerBlobGas * BLOB_GAS_PER_BLOB;
    const regularGasCost = estimatedGas * maxFeePerGas;
    const totalCost = regularGasCost + blobGasCost;
    
    console.log('Gas cost breakdown:', {
      rawEstimatedGas: rawEstimatedGas.toString(),
      bufferedGas: estimatedGas.toString(),
      regularGasCost: regularGasCost.toString(),
      blobGas: BLOB_GAS_PER_BLOB.toString(),
      blobGasCost: blobGasCost.toString(),
      totalCost: totalCost.toString(),
      totalCostEth: (Number(totalCost) / 1e18).toFixed(6),
    });

    // Check wallet balance
    const balance = await wallet.provider!.getBalance(wallet.address);
    console.log('Wallet balance:', balance.toString(), 'wei', `(${(Number(balance) / 1e18).toFixed(6)} ETH)`);
    
    if (balance < totalCost) {
      const shortfall = totalCost - balance;
      throw new Error(
        `Insufficient funds for transaction. ` +
        `Required: ${totalCost.toString()} wei (${(Number(totalCost) / 1e18).toFixed(6)} ETH), ` +
        `Available: ${balance.toString()} wei (${(Number(balance) / 1e18).toFixed(6)} ETH), ` +
        `Shortfall: ${shortfall.toString()} wei (${(Number(shortfall) / 1e18).toFixed(6)} ETH)`
      );
    }
  } catch (estimateError: unknown) {
    const errorMessage = estimateError instanceof Error ? estimateError.message : String(estimateError);
    if (errorMessage.includes('Insufficient funds')) {
      throw estimateError; // Re-throw our custom error
    }
    console.warn('Gas estimation failed, proceeding without limit:', errorMessage);
    // Continue without gas limit - ethers will estimate automatically
  }

  // Build final transaction request with gas limit if estimated
  const txRequest = estimatedGas 
    ? { ...baseTxRequest, gasLimit: estimatedGas }
    : baseTxRequest;

  // Send blob transaction WITH fulfill escrow contract call (ONE transaction)
  let blobTx: TransactionResponse;
  try {
    blobTx = await wallet.sendTransaction(txRequest);
    console.log('Blob transaction sent:', blobTx.hash);
  } catch (error: unknown) {
    // Handle "already known" error - transaction is already in mempool
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as { code?: string | number; error?: { code?: number; message?: string } };
    const errorCode = errorObj.code ?? errorObj.error?.code;
    
    const isAlreadyKnown =
      errorMessage.includes('already known') ||
      errorCode === -32000 ||
      (typeof errorCode === 'string' && errorCode.includes('32000')) ||
      errorObj.error?.message?.includes('already known');

    if (isAlreadyKnown) {
      console.warn(
        '⚠️ Transaction already in mempool (already known). ' +
        'This means the transaction was already submitted. ' +
        'We cannot get the transaction hash from this error, so the caller will need to wait and check escrow status.'
      );

      // We can't get the transaction hash from "already known" error
      // The caller will need to wait and check if escrow gets fulfilled
      throw new Error('TRANSACTION_ALREADY_IN_MEMPOOL');
    }
    
    // Re-throw other errors
    throw error;
  }

  return blobTx;
}

/**
 * Encode fulfill function call data
 */
export function encodeFulfillData(escrowId: string): string {
  const escrowInterface = new Interface(ESCROW_ABI);
  return escrowInterface.encodeFunctionData('fulfill', [escrowId]);
}

