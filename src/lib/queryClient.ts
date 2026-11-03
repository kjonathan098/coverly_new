import { QueryClient } from '@tanstack/react-query'
import { ApiError, ContractError } from './api'

const MAX_RETRIES = 3

export function shouldRetry(failureCount: number, error: unknown): boolean {
  // Retrying cannot fix a missing resource, a rejected request, or malformed data.
  if (error instanceof ContractError) return false
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })
}

export const queryClient = createQueryClient()
