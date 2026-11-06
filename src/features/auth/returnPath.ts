const MAX_LENGTH = 2000

/**
 * The Coverly route to come back to after Google login, or `/` when `path` isn't a safe one.
 *
 * The backend redirects to `http://localhost:5173${from}` without checking `from`, so a value such
 * as `@evil.example` would send the browser to another site. Only same-site paths are passed on:
 * one leading slash (no `//` or `/\`, which browsers read as another host), no backslashes or
 * control characters, and a sane length. The backend should validate `from` itself as well (see
 * docs/redesign/progress.md, "Backend issues").
 */
export function safeReturnPath(path: string): string {
  if (path.length > MAX_LENGTH) return '/'
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return '/'
  return path
}
