import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonClasses'

type Shared = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon, decorative. The text is the label. */
  icon?: ReactNode
  children: ReactNode
}

export function ButtonIcon({ icon }: { icon: ReactNode }) {
  return <span className="grid size-5 shrink-0 place-items-center *:size-5">{icon}</span>
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...rest}>
      {icon && <ButtonIcon icon={icon} />}
      {children}
    </button>
  )
}

/** Same looks as Button, for navigation. */
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...rest
}: Shared & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...rest}>
      {icon && <ButtonIcon icon={icon} />}
      {children}
    </a>
  )
}
