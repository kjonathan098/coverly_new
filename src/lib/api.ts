/*
 * The backend's origin. Development points at the local backend (.env.local). Production builds set
 * it empty (.env.production), so requests stay same-origin (`/api/...`) and the host's rewrite
 * (vercel.json) proxies them to the backend, keeping the session cookie first-party.
 */
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

if (configuredBaseUrl === undefined) {
  throw new Error('VITE_API_BASE_URL is not set. Copy .env.example to .env.local.')
}

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

export type ApiPath = `/${string}`

export function apiUrl(path: ApiPath): string {
  return `${API_BASE_URL}${path}`
}

export function apiFetch(path: ApiPath, init?: RequestInit): Promise<Response> {
  // The backend authenticates with a session cookie, so every request must carry credentials.
  return fetch(apiUrl(path), { ...init, credentials: 'include' })
}

/** The request reached the API, which reported a failure. */
export class ApiError extends Error {
  readonly status: number
  readonly path: ApiPath

  constructor(message: string, status: number, path: ApiPath) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

/** The API answered with data that does not match the agreed contract. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

type Envelope = { success: boolean; message: unknown }

function isEnvelope(body: unknown): body is Envelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Envelope).success === 'boolean' &&
    'message' in body
  )
}

/** Fetches `path` and returns the payload from the backend's `{ success, message }` envelope. */
export async function apiRequest(path: ApiPath, init?: RequestInit): Promise<unknown> {
  const response = await apiFetch(path, init)

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ContractError(`${path}: expected a JSON response (HTTP ${response.status})`)
  }
  if (!isEnvelope(body)) {
    throw new ContractError(`${path}: expected a { success, message } envelope`)
  }

  if (!response.ok || !body.success) {
    const detail = typeof body.message === 'string' ? body.message : 'request failed'
    throw new ApiError(`${path}: ${detail}`, response.status, path)
  }
  return body.message
}
