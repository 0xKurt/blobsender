/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate escrow ID format (bytes32)
 */
export function validateEscrowId(id: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(id);
}

/**
 * Validate transaction hash format
 */
export function validateTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate text input
 */
export function validateText(
  text: string,
  maxLength: number
): { valid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }

  if (text.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Text must be at most ${maxLength} characters`,
    };
  }

  return { valid: true };
}

