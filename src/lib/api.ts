const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!configuredBaseUrl) {
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
