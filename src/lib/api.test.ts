import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../mocks/server'
import { ApiError, ContractError, apiFetch, apiRequest, apiUrl } from './api'

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

describe('apiRequest', () => {
  const respond = (response: Response) => server.use(http.get(apiUrl('/api/ping'), () => response))

  it('unwraps the payload from a successful envelope', async () => {
    respond(HttpResponse.json({ success: true, message: { pong: 1 } }))
    await expect(apiRequest('/api/ping')).resolves.toEqual({ pong: 1 })
  })

  it('throws an ApiError carrying the status for a failed envelope', async () => {
    respond(HttpResponse.json({ success: false, message: 'Nope' }, { status: 404 }))
    const error = await apiRequest('/api/ping').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, path: '/api/ping', message: '/api/ping: Nope' })
  })

  it('treats success: false as a failure even with HTTP 200', async () => {
    respond(HttpResponse.json({ success: false, message: null }))
    await expect(apiRequest('/api/ping')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      message: '/api/ping: request failed',
    })
  })

  it('throws a ContractError for a non-JSON response', async () => {
    respond(new HttpResponse('hello', { headers: { 'content-type': 'text/plain' } }))
    await expect(apiRequest('/api/ping')).rejects.toThrow(ContractError)
  })

  it('throws a ContractError for JSON that is not an envelope', async () => {
    respond(HttpResponse.json([1, 2, 3]))
    await expect(apiRequest('/api/ping')).rejects.toThrow(
      /expected a \{ success, message \} envelope/,
    )
  })
})
