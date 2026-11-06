import { useCallback, useState, type MouseEvent } from 'react'
import { useLocation } from 'react-router'
import { buttonClasses } from '../../ui'
import { loginUrl, openLoginPopup, useLoginResult, useLogout, useSession } from './session'

const CONTROL = buttonClasses({ variant: 'secondary', className: 'min-h-9 px-3' })

/**
 * Log in / Log out, in the site header. Nothing shows until the backend has answered, so it never
 * flickers between states. If the session can't be checked at all, it offers Log in: browsing and
 * playback never depend on it.
 *
 * Log in opens Google in a popup, so the page and the music stay put. If the browser blocks the
 * popup, the link does what it says: the full-page login, which returns to this route.
 */
export function AccountControl() {
  const { pathname, search } = useLocation()
  const session = useSession()
  const logout = useLogout()
  const [loginFailed, setLoginFailed] = useState(false)
  useLoginResult(useCallback(() => setLoginFailed(true), []))

  if (session.isPending) return null

  const user = session.data
  if (!user) {
    const logIn = (event: MouseEvent<HTMLAnchorElement>) => {
      // Ctrl/Cmd/Shift-click: let the browser open the full-page login where it was asked to.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      setLoginFailed(false)
      if (openLoginPopup(pathname + search)) event.preventDefault()
    }
    return (
      <div className="flex items-center gap-3">
        <a href={loginUrl(pathname + search)} onClick={logIn} className={CONTROL}>
          Log in
        </a>
        <p role="status" className="m-0 text-meta text-pink empty:hidden">
          {loginFailed ? 'Login didn’t finish.' : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <p className="m-0 hidden max-w-40 truncate text-label text-fg-soft tablet:block">
        <span className="sr-only">Logged in as </span>
        {user.name}
      </p>
      <button
        type="button"
        className={CONTROL}
        disabled={logout.isPending}
        aria-label={`Log out ${user.name}`}
        onClick={() => logout.mutate()}
      >
        Log out
      </button>
      <p role="status" className="m-0 text-meta text-pink empty:hidden">
        {logout.isError ? 'Couldn’t log out. Try again.' : ''}
      </p>
    </div>
  )
}
