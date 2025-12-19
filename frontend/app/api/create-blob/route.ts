import { NextRequest, NextResponse } from 'next/server';
import { Wallet, JsonRpcProvider, Contract, type TransactionReceipt } from 'ethers';
import { getServerConfigInstance } from './lib/config';
import { ESCROW_ABI, MAX_RETRIES, RETRY_DELAY_MS } from './lib/constants';
import { validateRequestInput } from './lib/validation';
import { verifyEscrowSecurity, waitForEscrowTransaction } from './lib/escrow';
import { initializeKzgLibrary, prepareBlobData, sendBlobTransaction, encodeFulfillData } from './lib/blob';
import { retryOperation } from './lib/utils';
import { getPriceQuote } from '../lib/price-cache';
import { addBlobToCache, getCachedBlobs, type BlobCacheEntry } from '../lib/blob-cache';
import { isEscrowProcessing, markEscrowProcessing, markEscrowComplete } from '../lib/processing-escrows';
import type { CreateBlobRequest, CreateBlobErrorResponse, CreateBlobSuccessResponse } from '../../types';

// Force Node.js runtime - blobkit requires it
export const runtime = 'nodejs';

/**
 * Build error response with withdrawal information
 */
function buildErrorResponse(
  error: string,
  escrowId: string,
  escrowTxHash: string,
  canWithdraw: boolean,
  details?: string,
  expectedValue?: string,
  actualValue?: string,
  blobTxHash?: string
): NextResponse<CreateBlobErrorResponse> {
  const config = getServerConfigInstance();
  const response: CreateBlobErrorResponse = {
    error,
    escrowId,
    escrowTxHash,
    canWithdraw,
    withdrawDelay: config.withdrawDelayMinutes,
    details,
    expectedValue,
    actualValue,
  };

  if (escrowTxHash) {
    response.etherscanLink = `${config.etherscanUrl}/tx/${escrowTxHash}`;
  }

  if (canWithdraw) {
    response.contractLink = `${config.etherscanUrl}/address/${config.escrowAddress}#writeContract`;
  }

  if (blobTxHash) {
    // Could add blob transaction link if needed
  }

  return NextResponse.json(response, { status: canWithdraw ? 400 : 500 });
}

/**
 * Build success response
 */
async function buildSuccessResponse(
  escrowId: string,
  blobTxHash: string,
  blobVersionedHash: string | undefined,
  userAddress: string,
  text: string
): Promise<NextResponse<CreateBlobSuccessResponse>> {
  const config = getServerConfigInstance();
  const blobscanLink = blobVersionedHash
    ? `${config.blobscanUrl}/blob/${blobVersionedHash}`
    : '';
  const etherscanLink = `${config.etherscanUrl}/tx/${blobTxHash}`;

  // Add to cache (file-based, persists across invocations)
  // Store full message - frontend will handle display/truncation
  await addBlobToCache({
    creator: userAddress,
    message: text, // Store full message
    blobscanLink,
    date: new Date().toISOString(),
    escrowId,
  });

  return NextResponse.json({
    success: true,
    escrowId,
    blobTxHash,
    blobscanLink,
    etherscanLink,
  });
}

/**
 * Wait for user's escrow transaction to be confirmed
 */
async function waitForUserEscrowTransaction(
  provider: JsonRpcProvider,
  txHash: string
): Promise<TransactionReceipt> {
  console.log('=== STEP 1: WAIT FOR USER ESCROW TRANSACTION ===');
  console.log('Escrow TX Hash:', txHash);

  try {
    const receipt = await waitForEscrowTransaction(
      provider,
      txHash,
      MAX_RETRIES * 2, // More retries since we're waiting for user's tx
      RETRY_DELAY_MS
    );

    console.log(`Escrow transaction confirmed at tx ${txHash}`);
    return receipt;
  } catch (error) {
    console.error('Error waiting for escrow transaction:', error);
    throw new Error(
      `Escrow transaction not found or not confirmed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


/**
 * Create and send blob transaction with fulfill escrow call
 */
async function createAndSendBlob(
  wallet: Wallet,
  text: string,
  escrowId: string,
  contractAddress: string
) {
  console.log('=== STEP 3: PREPARE BLOB DATA ===');
  console.log('Text length:', text.length);

  // Initialize KZG library
  await initializeKzgLibrary();

  // Prepare blob data
  const blobData = await prepareBlobData(text);

  // Encode fulfill function call
  const fulfillData = encodeFulfillData(escrowId);
  console.log('Encoded fulfill function data:', fulfillData);

  console.log('=== STEP 4: SEND BLOB TRANSACTION WITH FULFILL ESCROW ===');
  console.log('Contract:', contractAddress);
  console.log('Function: fulfill(bytes32)');
  console.log('Escrow ID:', escrowId);

  // Get fee data
  const feeData = await wallet.provider!.getFeeData();

  // Send blob transaction
  const blobTx = await sendBlobTransaction(
    wallet,
    contractAddress,
    fulfillData,
    blobData,
    {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    }
  );

  console.log('Blob transaction sent:', blobTx.hash);
  console.log('Waiting for confirmation...');

  // Wait for confirmation
  const blobReceipt = await retryOperation(
    () => blobTx.wait(),
    MAX_RETRIES,
    RETRY_DELAY_MS
  );

  if (!blobReceipt || blobReceipt.status !== 1) {
    throw new Error('Blob transaction failed or reverted');
  }

  console.log(`✅ Blob transaction with fulfill confirmed at tx ${blobTx.hash}`);
  console.log(`   Blob Versioned Hashes: ${blobTx.blobVersionedHashes?.join(', ')}`);

  return {
    txHash: blobTx.hash,
    blobVersionedHash: blobTx.blobVersionedHashes?.[0],
  };
}

/**
 * Main handler for create-blob request
 */
export async function POST(request: NextRequest) {
  console.log('=== POST /api/create-blob CALLED ===');
  console.log('Request method:', request.method);
  console.log('Request URL:', request.url);
  
  // Parse request body once at the start (can only be called once)
  let body: Partial<CreateBlobRequest>;
    let text = '';
    let userAddress: `0x${string}` = '0x' as `0x${string}`;
    let escrowTxHash: `0x${string}` = '0x' as `0x${string}`;
    let escrowId = 'unknown';
    let expectedValue: bigint | null = null; // Store expected value for error handler

  try {
    console.log('=== CREATE BLOB REQUEST ===');

    // Parse request body
    try {
      body = await request.json();
      console.log('Request body received:', {
        textLength: body.text?.length ?? 0,
        userAddress: body.userAddress,
        escrowTxHash: body.escrowTxHash,
        escrowId: body.escrowId,
      });
      
      // Try to extract escrowId early for error handling
      if (body.escrowId) {
        escrowId = body.escrowId;
      }
      if (body.escrowTxHash) {
        escrowTxHash = body.escrowTxHash as `0x${string}`;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      // If we have escrow info, try to provide withdrawal info
      if (escrowId !== 'unknown' && escrowTxHash !== '0x') {
        try {
          const config = getServerConfigInstance();
          const provider = new JsonRpcProvider(config.rpcUrl, undefined, { polling: false });
          const escrowContract = new Contract(config.escrowAddress, ESCROW_ABI, provider);
          const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, '0x' as `0x${string}`, 0n);
          if (escrowCheck.valid && escrowCheck.escrowData) {
            return buildErrorResponse(
              'Invalid JSON in request body',
              escrowId,
              escrowTxHash,
              true,
              'Request format error',
              undefined,
              escrowCheck.escrowData.value.toString()
            );
          }
        } catch {
          // Ignore - can't check escrow
        }
      }
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateRequestInput(body);
    if (!validation.valid) {
      console.error('Input validation failed:', validation.error);
      // Try to provide withdrawal info if we have escrow data
      if (escrowId !== 'unknown' && escrowTxHash !== '0x') {
        try {
          const config = getServerConfigInstance();
          const provider = new JsonRpcProvider(config.rpcUrl, undefined, { polling: false });
          const escrowContract = new Contract(config.escrowAddress, ESCROW_ABI, provider);
          const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, (body.userAddress || '0x') as `0x${string}`, 0n);
          if (escrowCheck.valid && escrowCheck.escrowData) {
            return buildErrorResponse(
              validation.error || 'Input validation failed',
              escrowId,
              escrowTxHash,
              true,
              'Validation error',
              undefined,
              escrowCheck.escrowData.value.toString()
            );
          }
        } catch {
          // Ignore - can't check escrow
        }
      }
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Extract variables for use throughout the function
    const validatedBody = body as CreateBlobRequest;
    text = validatedBody.text;
    userAddress = validatedBody.userAddress as `0x${string}`;
    escrowTxHash = validatedBody.escrowTxHash as `0x${string}`;
    escrowId = validatedBody.escrowId;
    const quoteId = validatedBody.quoteId;

    // Initialize provider and contracts first (needed for escrow checks)
    let config: ReturnType<typeof getServerConfigInstance>;
    let provider: JsonRpcProvider;
    let wallet: Wallet;
    let escrowContract: Contract;
    
    try {
      config = getServerConfigInstance();
      console.log('Initializing providers and contracts...');
      provider = new JsonRpcProvider(config.rpcUrl, undefined, { polling: false });
      wallet = new Wallet(config.privateKey, provider);
      console.log('Worker wallet address:', wallet.address);
      escrowContract = new Contract(config.escrowAddress, ESCROW_ABI, provider);
    } catch (initError: unknown) {
      console.error('=== FAILED TO INITIALIZE PROVIDER/CONTRACT ===');
      console.error('Error:', initError);
      console.error('Escrow ID:', escrowId);
      console.error('Escrow TX Hash:', escrowTxHash);
      
      // Try to provide withdrawal info even if provider init failed
      // This handles RPC connection issues
      try {
        const fallbackConfig = getServerConfigInstance();
        const fallbackProvider = new JsonRpcProvider(fallbackConfig.rpcUrl, undefined, { polling: false });
        const fallbackEscrowContract = new Contract(fallbackConfig.escrowAddress, ESCROW_ABI, fallbackProvider);
        const escrowCheck = await verifyEscrowSecurity(fallbackEscrowContract, escrowId, userAddress, 0n);
        if (escrowCheck.valid && escrowCheck.escrowData) {
          return buildErrorResponse(
            `Failed to initialize RPC connection: ${initError instanceof Error ? initError.message : 'Unknown error'}. Your escrow exists and you can withdraw after the delay.`,
            escrowId,
            escrowTxHash,
            true,
            'RPC initialization failed',
            undefined,
            escrowCheck.escrowData.value.toString()
          );
        }
      } catch (fallbackError: unknown) {
        console.error('Fallback escrow check also failed:', fallbackError);
      }
      
      // If we can't check escrow, still provide withdrawal info (safer for user)
      return buildErrorResponse(
        `Failed to initialize RPC connection: ${initError instanceof Error ? initError.message : 'Unknown error'}. If your escrow transaction was confirmed, you can withdraw after the delay.`,
        escrowId,
        escrowTxHash,
        true, // Assume escrow exists and can withdraw
        'RPC initialization failed'
      );
    }

    // Step -1: Check if this escrow is already being processed (prevent duplicate requests)
    if (isEscrowProcessing(escrowId)) {
      console.warn(`[create-blob] Escrow ${escrowId} is already being processed, rejecting duplicate request`);
      
      // Still check escrow status to provide helpful response
      try {
        await waitForUserEscrowTransaction(provider, escrowTxHash);
        const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, userAddress, 0n);
        if (escrowCheck.valid && escrowCheck.escrowData) {
          if (escrowCheck.escrowData.fulfilled) {
            // Already fulfilled, return success
            return await buildSuccessResponse(
              escrowId,
              '0x' + '0'.repeat(64), // Placeholder
              undefined,
              userAddress,
              text
            );
          }
          // Still processing, return error with withdrawal info
          return buildErrorResponse(
            'This escrow is already being processed. Please wait for the current request to complete.',
            escrowId,
            escrowTxHash,
            true, // Can withdraw if needed
            'Duplicate request detected',
            undefined,
            escrowCheck.escrowData.value.toString()
          );
        }
      } catch (escrowError: unknown) {
        // Escrow doesn't exist or transaction not found
      }
      
      return buildErrorResponse(
        'This escrow is already being processed. Please wait for the current request to complete.',
        escrowId,
        escrowTxHash,
        false,
        'Duplicate request detected'
      );
    }

    // Mark escrow as being processed
    markEscrowProcessing(escrowId);

    try {
      // Step 0: Get cached price quote (SECURITY: This is the exact price shown to the user)
      console.log('=== STEP 0: VERIFY QUOTED PRICE ===');
    console.log('[create-blob] Quote ID received:', quoteId);
    
    if (!quoteId) {
      console.error('[create-blob] Missing quote ID');
      // Still check escrow and provide withdrawal info
      try {
        await waitForUserEscrowTransaction(provider, escrowTxHash);
        const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, userAddress, 0n);
        if (escrowCheck.valid && escrowCheck.escrowData) {
          return buildErrorResponse(
            'Missing quote ID. Please refresh the page and try again.',
            escrowId,
            escrowTxHash,
            true, // Can withdraw
            'Quote ID is required to verify the price',
            undefined,
            escrowCheck.escrowData.value.toString()
          );
        }
      } catch (escrowError: unknown) {
        // Escrow doesn't exist
      }
      
      return buildErrorResponse(
        'Missing quote ID',
        escrowId,
        escrowTxHash,
        false,
        'Quote ID is required to verify the price'
      );
    }
    
    // Get the cached price that was shown to the user
    const quotedPriceWei = await getPriceQuote(quoteId);
    if (!quotedPriceWei) {
      console.error('[create-blob] Invalid or expired quote ID:', quoteId);
      console.error('[create-blob] This could mean:');
      console.error('[create-blob]   1. Quote ID was never created');
      console.error('[create-blob]   2. Quote ID expired (>5 minutes old)');
      console.error('[create-blob]   3. Cache file issue');
      
      // Still check escrow and provide withdrawal info
      try {
        await waitForUserEscrowTransaction(provider, escrowTxHash);
        const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, userAddress, 0n);
        if (escrowCheck.valid && escrowCheck.escrowData) {
          return buildErrorResponse(
            'Invalid or expired quote ID. Please refresh the page and try again.',
            escrowId,
            escrowTxHash,
            true, // Can withdraw
            'The price quote has expired or is invalid',
            undefined,
            escrowCheck.escrowData.value.toString()
          );
        }
      } catch (escrowError: unknown) {
        // Escrow doesn't exist
      }
      
      return buildErrorResponse(
        'Invalid or expired quote ID. Please refresh the page and try again.',
        escrowId,
        escrowTxHash,
        false,
        'The price quote has expired or is invalid'
      );
    }
    
    expectedValue = BigInt(quotedPriceWei);
    console.log('[create-blob] ✅ Using cached quoted price:', expectedValue.toString(), 'wei');
    console.log('[create-blob] This is the exact price that was displayed to the user');

    // Step 1: Wait for user's escrow transaction
    await waitForUserEscrowTransaction(provider, escrowTxHash);

    // Step 2: Check if escrow is already fulfilled (prevent duplicate processing)
    const initialCheck = await verifyEscrowSecurity(
      escrowContract,
      escrowId,
      userAddress,
      expectedValue
    );

    if (initialCheck.valid && initialCheck.escrowData?.fulfilled) {
      console.log('✅ Escrow is already fulfilled - blob was already created');
      return await buildSuccessResponse(
        escrowId,
        '0x' + '0'.repeat(64), // Placeholder - transaction already processed
        undefined, // Blob versioned hash unknown
        userAddress,
        text
      );
    }

    // Step 3: Verify escrow security with expected value
    const securityResult = await verifyEscrowSecurity(
      escrowContract,
      escrowId,
      userAddress,
      expectedValue
    );

    if (!securityResult.valid) {
      console.error('Escrow security verification failed:', securityResult.error);
      return buildErrorResponse(
        securityResult.error || 'Escrow verification failed',
        escrowId,
        escrowTxHash,
        true,
        securityResult.error,
        expectedValue.toString(),
        securityResult.actualValue?.toString()
      );
    }

    console.log('Escrow security verification passed');

    // Step 4 & 5: Create and send blob transaction
    let blobResult;
    try {
      blobResult = await createAndSendBlob(
        wallet,
        text,
        escrowId,
        config.escrowAddress
      );
    } catch (blobError: unknown) {
      const blobErrorMessage = blobError instanceof Error ? blobError.message : String(blobError);
      
      // Handle "already known" error - wait for transaction to confirm
      if (blobErrorMessage === 'TRANSACTION_ALREADY_IN_MEMPOOL' || blobErrorMessage.includes('already in mempool') || blobErrorMessage.includes('already known')) {
        console.warn('Blob transaction already in mempool, waiting for confirmation...');
        
        // Wait and check if escrow gets fulfilled (transaction is processing)
        const maxWaitTime = 60 * 1000; // 60 seconds
        const checkInterval = 3 * 1000; // Check every 3 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, userAddress, expectedValue);
          
          if (escrowCheck.valid && escrowCheck.escrowData?.fulfilled) {
            console.log('✅ Escrow fulfilled - blob transaction confirmed!');
            
            // Transaction completed successfully
            return await buildSuccessResponse(
              escrowId,
              '0x' + '0'.repeat(64), // Placeholder - we don't have the hash
              undefined, // Blob versioned hash unknown
              userAddress,
              text
            );
          }
          
          console.log(`Waiting for transaction confirmation... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        }
        
        // Timeout - transaction is still pending
        console.warn('Transaction still pending after waiting, providing withdrawal info');
        return buildErrorResponse(
          'Blob transaction is pending in mempool. Please wait for it to be confirmed. ' +
          'If it takes too long, you can withdraw your funds after the withdrawal delay.',
          escrowId,
          escrowTxHash,
          true, // Can withdraw
          'Transaction is pending confirmation in the mempool',
          expectedValue.toString(),
          undefined
        );
      }
      
      // Re-throw other errors
      throw blobError;
    }

    // Success
    return await buildSuccessResponse(
      escrowId,
      blobResult.txHash,
      blobResult.blobVersionedHash,
      userAddress,
      text
    );
    } catch (blobError: unknown) {
      // Re-throw to outer catch
      throw blobError;
    } finally {
      // Always release the processing lock (even if we returned early or errored)
      markEscrowComplete(escrowId);
    }
  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN POST HANDLER ===');
    console.error('Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Escrow ID:', escrowId);
    console.error('Escrow TX Hash:', escrowTxHash);
    console.error('User Address:', userAddress);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    // Always try to provide withdrawal info if escrow exists
    // This is critical - user must be able to withdraw even if RPC fails
    let canWithdraw = true; // Default to true - assume escrow exists (safer for user)
    let actualValue: string | undefined;
    
    // Only try to check escrow if we have valid escrow info
    if (escrowId !== 'unknown' && escrowTxHash !== '0x' && userAddress !== '0x') {
      try {
        const config = getServerConfigInstance();
        const provider = new JsonRpcProvider(config.rpcUrl);
        const escrowContract = new Contract(config.escrowAddress, ESCROW_ABI, provider);
        
        // Check if escrow exists and get its value
        // Use expectedValue if available, otherwise 0n (will still check if escrow exists)
        const checkValue = expectedValue !== null ? expectedValue : 0n;
        const escrowCheck = await verifyEscrowSecurity(escrowContract, escrowId, userAddress, checkValue);
        if (escrowCheck.valid && escrowCheck.escrowData) {
          canWithdraw = !escrowCheck.escrowData.fulfilled; // Can withdraw if not fulfilled
          actualValue = escrowCheck.escrowData.value.toString();
          console.log(`[error-handler] ✅ Escrow exists, canWithdraw: ${canWithdraw}, value: ${actualValue}`);
        } else {
          canWithdraw = false; // Escrow doesn't exist
          console.log('[error-handler] ❌ Escrow does not exist');
        }
      } catch (checkError: unknown) {
        // If we can't check escrow (e.g., RPC is down), still allow withdrawal (safer for user)
        console.warn('[error-handler] ⚠️ Could not verify escrow status (RPC may be down):', checkError);
        console.warn('[error-handler] ⚠️ Assuming escrow exists and user can withdraw (safer default)');
        canWithdraw = true; // Assume escrow exists if we can't check
      }
    } else {
      console.warn('[error-handler] ⚠️ Missing escrow info - cannot provide withdrawal details');
      console.warn('[error-handler] Escrow ID:', escrowId);
      console.warn('[error-handler] Escrow TX Hash:', escrowTxHash);
      console.warn('[error-handler] User Address:', userAddress);
      canWithdraw = false; // Can't withdraw if we don't have escrow info
    }

    // Always return error response with withdrawal info if available
    const errorResponse = buildErrorResponse(
      errorMessage,
      escrowId,
      escrowTxHash,
      canWithdraw,
      errorMessage,
      expectedValue !== null ? expectedValue.toString() : undefined, // Use expected value if available
      actualValue
    );
    
    console.log('=== RETURNING ERROR RESPONSE ===');
    console.log('Status:', errorResponse.status);
    console.log('Can Withdraw:', canWithdraw);
    console.log('Escrow ID in response:', escrowId);
    return errorResponse;
  } finally {
    // Always release the processing lock (even if we returned early)
    // Only mark complete if we haven't already (avoid double release)
    if (escrowId !== 'unknown') {
      markEscrowComplete(escrowId);
    }
  }
}

export async function GET() {
  const blobs = await getCachedBlobs();
  return NextResponse.json({ blobs });
}
