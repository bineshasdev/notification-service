import { env } from '../config/env'
import { logger } from './logger'

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts     = env.MAX_RETRY_ATTEMPTS,
    delayMs         = env.RETRY_DELAY_MS,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === maxAttempts) break

      const wait = delayMs * Math.pow(backoffMultiplier, attempt - 1)
      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${wait}ms`, { error: lastError.message })
      onRetry?.(attempt, lastError)
      await new Promise((res) => setTimeout(res, wait))
    }
  }

  throw lastError
}
