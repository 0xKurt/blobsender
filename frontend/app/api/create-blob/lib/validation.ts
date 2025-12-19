import { MAX_TEXT_LENGTH } from './constants';
import type { CreateBlobRequest } from '../../../types';

/**
 * Strict validation for Ethereum address format
 */
export function validateAddress(address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: 'Invalid address format' };
  }

  return { valid: true };
}

/**
 * Strict validation for escrow ID format (bytes32)
 */
export function validateEscrowId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Escrow ID is required' };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
    return { valid: false, error: 'Invalid escrow ID format' };
  }

  return { valid: true };
}

/**
 * Strict validation for transaction hash format
 */
export function validateTxHash(hash: string): { valid: boolean; error?: string } {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, error: 'Transaction hash is required' };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return { valid: false, error: 'Invalid transaction hash format' };
  }

  return { valid: true };
}

/**
 * Strict validation for text input
 */
export function validateText(text: string): { valid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }

  if (text.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text must be at most ${MAX_TEXT_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Comprehensive validation of create-blob request input
 * All validations must pass before processing
 */
export function validateRequestInput(
  body: Partial<CreateBlobRequest>
): { valid: boolean; error?: string } {
  // Validate text
  if (!body.text) {
    return { valid: false, error: 'Text is required' };
  }
  const textValidation = validateText(body.text);
  if (!textValidation.valid) {
    return textValidation;
  }

  // Validate user address
  if (!body.userAddress) {
    return { valid: false, error: 'User address is required' };
  }
  const addressValidation = validateAddress(body.userAddress);
  if (!addressValidation.valid) {
    return addressValidation;
  }

  // Validate escrow transaction hash
  if (!body.escrowTxHash) {
    return { valid: false, error: 'Escrow transaction hash is required' };
  }
  const txHashValidation = validateTxHash(body.escrowTxHash);
  if (!txHashValidation.valid) {
    return txHashValidation;
  }

  // Validate escrow ID
  if (!body.escrowId) {
    return { valid: false, error: 'Escrow ID is required' };
  }
  const escrowIdValidation = validateEscrowId(body.escrowId);
  if (!escrowIdValidation.valid) {
    return escrowIdValidation;
  }

  // Quote ID is optional (no longer used, but kept for backwards compatibility)
  // Backend will calculate price directly instead of using cached quote

  return { valid: true };
}

