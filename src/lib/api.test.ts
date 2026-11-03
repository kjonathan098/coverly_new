import { afterEach, expect, it, vi } from 'vitest'
import { apiFetch, apiUrl } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

it('builds URLs from the configured API base', () => {
  expect(apiUrl('/api/user/getUser')).toBe('http://api.test/api/user/getUser')
})

it('always sends credentials so the session cookie reaches the backend', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))

  await apiFetch('/api/ping', { method: 'POST', credentials: 'omit' })

  expect(fetchSpy).toHaveBeenCalledWith('http://api.test/api/ping', {
    method: 'POST',
    credentials: 'include',
  })
})
