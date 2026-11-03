import type { HTMLAttributes } from 'react'
import { cx } from './cx'
import { Surface, type SurfaceTone } from './Surface'

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  /** full: page margins only. page: centered, capped width. reading: a single comfortable text column. */
  size?: 'full' | 'page' | 'reading'
}

const SIZES = {
  full: 'px-margin',
  page: 'mx-auto w-full max-w-page px-margin',
  reading: 'mx-auto w-full max-w-reading px-margin',
} as const

export function Container({ size = 'page', className, ...rest }: ContainerProps) {
  return <div className={cx(SIZES[size], className)} {...rest} />
}

type SectionProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  tone?: SurfaceTone
  grain?: boolean
  size?: ContainerProps['size']
  children: ContainerProps['children']
}

/** A full-width band on one surface, with the content held in a Container. */
export function Section({
  tone = 'paper',
  grain = false,
  size = 'page',
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <Surface
      as="section"
      tone={tone}
      grain={grain}
      className={cx('pt-8 pb-16 tablet:pb-24', className)}
      {...rest}
    >
      <Container size={size}>{children}</Container>
    </Surface>
  )
}
