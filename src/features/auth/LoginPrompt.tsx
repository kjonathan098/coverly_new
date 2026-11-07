import { useLocation } from 'react-router'
import { Button } from '../../ui'
import { startLogin } from './session'

/** What a guest sees where personal features would be: why to log in, and the Google login. */
export function LoginPrompt({ title, children }: { title: string; children: string }) {
  const { pathname, search } = useLocation()
  return (
    <div className="grid justify-items-start gap-4">
      <p className="type-card m-0">{title}</p>
      <p className="m-0 max-w-[48ch] text-fg-soft">{children}</p>
      <Button onClick={() => startLogin(pathname + search)}>Log in with Google</Button>
    </div>
  )
}
