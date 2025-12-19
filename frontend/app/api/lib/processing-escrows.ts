/**
 * In-memory tracking of escrows currently being processed
 * Prevents duplicate processing of the same escrow ID
 */

interface ProcessingEscrow {
  escrowId: string;
  startTime: number;
}

const processingEscrows = new Map<string, ProcessingEscrow>();
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - should never take this long

/**
 * Clean up expired processing entries
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [escrowId, entry] of processingEscrows.entries()) {
    if (now - entry.startTime > PROCESSING_TIMEOUT_MS) {
      processingEscrows.delete(escrowId);
      console.log(`[processing-escrows] Removed expired entry for escrow: ${escrowId}`);
    }
  }
}

/**
 * Check if an escrow is currently being processed
 */
export function isEscrowProcessing(escrowId: string): boolean {
  cleanupExpired();
  return processingEscrows.has(escrowId);
}

/**
 * Mark an escrow as being processed
 */
export function markEscrowProcessing(escrowId: string): void {
  cleanupExpired();
  processingEscrows.set(escrowId, {
    escrowId,
    startTime: Date.now(),
  });
  console.log(`[processing-escrows] Marked escrow as processing: ${escrowId}`);
}

/**
 * Mark an escrow as no longer being processed
 */
export function markEscrowComplete(escrowId: string): void {
  processingEscrows.delete(escrowId);
  console.log(`[processing-escrows] Marked escrow as complete: ${escrowId}`);
}

