/**
 * Centralized retry policy for the AI agent harness.
 *
 * This module provides:
 * - Error classification (retryable vs non-retryable)
 * - Exponential backoff retry logic
 * - Configuration for maximum attempts
 *
 * All retry logic lives here to avoid scattering retry counts across components.
 */

export const MAX_ATTEMPTS = 4; // 1 initial + 3 retries
export const BASE_DELAY_MS = 500;
export const MAX_DELAY_MS = 8000;

/**
 * Error codes that should trigger a retry.
 * These represent transient failures that may succeed on a subsequent attempt.
 */
export const RETRYABLE_ERROR_CODES = new Set([
  // Network/timeout errors
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
  // HTTP status codes that indicate transient server issues
  '429', // Too Many Requests (rate limiting)
  '500', // Internal Server Error
  '502', // Bad Gateway
  '503', // Service Unavailable
  '504', // Gateway Timeout
]);

/**
 * Error codes that should NEVER trigger a retry.
 * These represent permanent failures that won't succeed on retry.
 */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  // Authentication/authorization
  '401', // Unauthorized
  '403', // Forbidden
  // Invalid requests
  '400', // Bad Request
  '404', // Not Found
  '422', // Unprocessable Entity
  // Model/configuration errors
  'unsupported_model',
  'invalid_model',
  'model_not_found',
  'context_length_exceeded',
  // Content/safety
  'content_policy_violation',
  'safety_violation',
  // Billing/quota
  'insufficient_quota',
  'billing_error',
  'rate_limit_exceeded', // Permanent rate limit (different from 429 transient)
]);

/**
 * Determines if an error is retryable based on its code/message.
 *
 * @param error - The error to classify
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Check for AbortError (user cancellation) - never retry
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  // Check for AI SDK specific error structure
  const aiError = error as { code?: string; status?: number; cause?: unknown };

  // Check explicit error code
  if (aiError.code && RETRYABLE_ERROR_CODES.has(aiError.code)) {
    return true;
  }
  if (aiError.code && NON_RETRYABLE_ERROR_CODES.has(aiError.code)) {
    return false;
  }

  // Check HTTP status code
  if (aiError.status && RETRYABLE_ERROR_CODES.has(String(aiError.status))) {
    return true;
  }
  if (aiError.status && NON_RETRYABLE_ERROR_CODES.has(String(aiError.status))) {
    return false;
  }

  // Check cause chain for nested errors
  if (aiError.cause) {
    return isRetryableError(aiError.cause);
  }

  // Check error message for known patterns
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Transient patterns
  const transientPatterns = [
    'timeout',
    'timed out',
    'connection refused',
    'connection reset',
    'network error',
    'econnreset',
    'etimedout',
    'temporary failure',
    'service unavailable',
    'upstream',
    'provider error',
    'rate limit', // Could be transient
  ];

  // Permanent patterns
  const permanentPatterns = [
    'unauthorized',
    'forbidden',
    'invalid api key',
    'invalid credentials',
    'authentication failed',
    'bad request',
    'unsupported',
    'not found',
    'content policy',
    'safety violation',
    'quota exceeded',
    'billing',
    'context length',
    'token limit',
  ];

  for (const pattern of permanentPatterns) {
    if (lowerMessage.includes(pattern)) {
      return false;
    }
  }

  for (const pattern of transientPatterns) {
    if (lowerMessage.includes(pattern)) {
      return true;
    }
  }

  // Default: if we can't classify, don't retry (safer)
  return false;
}

/**
 * Calculates the delay for a given attempt using exponential backoff with jitter.
 *
 * @param attempt - The attempt number (0-indexed, so first retry is attempt 1)
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Executes a function with retry logic.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the successful attempt
 * @throws The last error if all attempts fail
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
    isRetryable?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const isRetryable = options.isRetryable ?? isRetryableError;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }

      // Check if error is retryable
      if (!isRetryable(error)) {
        break;
      }

      const delayMs = calculateDelay(attempt + 1); // attempt is 0-indexed
      options.onRetry?.(error, attempt + 1, delayMs);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}