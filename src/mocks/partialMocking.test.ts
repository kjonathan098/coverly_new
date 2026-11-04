import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { apiUrl } from '../lib/api'
import { selectHandlers, type HandlerRegistry, type MockGroup } from './groups'
import { server } from './server'

// A real local HTTP server stands in for the backend, so bypassed requests are observable.
let backend: Server
let backendUrl: string

beforeAll(async () => {
  backend = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ from: 'backend', path: request.url }))
  })
  await new Promise<void>((resolve) => backend.listen(0, '127.0.0.1', resolve))
  backendUrl = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => backend.close(() => resolve())))

function registryFor(baseUrl: string): HandlerRegistry {
  const handlerFor = (group: MockGroup) =>
    http.get(`${baseUrl}/api/${group}`, () => HttpResponse.json({ from: 'mock', group }))
  return {
    recordings: [handlerFor('recordings')],
    songs: [handlerFor('songs')],
    auth: [handlerFor('auth')],
    artists: [handlerFor('artists')],
    tags: [handlerFor('tags')],
  }
}

async function getJson(url: string) {
  const response = await fetch(url)
  return response.json()
}

describe('partial mocking', () => {
  it('answers requests in an enabled group from MSW', async () => {
    server.use(...selectHandlers(['recordings'], registryFor(backendUrl)))

    expect(await getJson(`${backendUrl}/api/recordings`)).toEqual({
      from: 'mock',
      group: 'recordings',
    })
  })

  it('lets requests in disabled groups bypass MSW and reach the backend', async () => {
    server.use(...selectHandlers(['recordings'], registryFor(backendUrl)))

    expect(await getJson(`${backendUrl}/api/auth`)).toEqual({ from: 'backend', path: '/api/auth' })
    expect(await getJson(`${backendUrl}/api/tags`)).toEqual({ from: 'backend', path: '/api/tags' })
  })

  it('fails unmocked requests to the API origin during tests', async () => {
    await expect(fetch(apiUrl('/api/not-mocked'))).rejects.toThrow()
  })
})
