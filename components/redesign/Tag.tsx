import type { MouseEvent, ReactNode } from 'react'

import { HAIRLINE, LABEL } from './tokens'

export interface TagProps {
  children: ReactNode
  href?: string
  onClick?: (e: MouseEvent) => void
}

const BASE = `${LABEL} ${HAIRLINE} inline-block px-2 py-1 leading-none`

export function Tag({ children, href, onClick }: TagProps) {
  if (href) {
    return (
      <a className={`${BASE} hover:text-link hover:border-link`} href={href} onClick={onClick}>
        {children}
      </a>
    )
  }
  if (onClick) {
    return (
      <button className={`${BASE} hover:text-link hover:border-link`} onClick={onClick} type="button">
        {children}
      </button>
    )
  }
  return <span className={BASE}>{children}</span>
}
