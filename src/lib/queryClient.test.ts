import { expect, it } from 'vitest'
import { ApiError, ContractError } from './api'
import { shouldRetry } from './queryClient'

it('does not retry contract errors or client errors', () => {
  expect(shouldRetry(0, new ContractError('bad shape'))).toBe(false)
  expect(shouldRetry(0, new ApiError('not found', 404, '/api/x'))).toBe(false)
})

it('retries server and network errors up to three times', () => {
  const serverError = new ApiError('boom', 500, '/api/x')
  expect(shouldRetry(0, serverError)).toBe(true)
  expect(shouldRetry(2, serverError)).toBe(true)
  expect(shouldRetry(3, serverError)).toBe(false)
  expect(shouldRetry(0, new TypeError('fetch failed'))).toBe(true)
})
