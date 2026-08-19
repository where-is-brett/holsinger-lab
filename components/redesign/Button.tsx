import type { ReactNode } from 'react'

import { HAIRLINE, PRESS } from './tokens'

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  active?: boolean
}

// Mono caps label styling, matching LABEL's font/size/case but not its baked
// -in text-text-faint colour: Button's rest colour is text-muted, and
// `active` swaps colour and border to the link/accent colour, so those two
// utilities are chosen per branch below rather than layered on top of a
// fixed class -- otherwise two same-property utilities (e.g. border-rule
// -strong and border-link) would sit in the class list together, and which
// one wins would depend on Tailwind's generation order, not on `active`.
const SHAPE = 'inline-flex min-h-11 items-center justify-center px-4 font-mono text-label uppercase leading-none bg-transparent'

export function Button({ children, onClick, href, disabled = false, active = false }: ButtonProps) {
  const border = active ? 'border border-link' : HAIRLINE
  const color = active ? 'text-link' : 'text-text-muted'
  const className = `${SHAPE} ${border} ${color} ${PRESS} disabled:cursor-not-allowed disabled:opacity-[0.45]`

  // Anchors have no disabled semantics, so a disabled+href button still
  // renders as a real <button disabled> rather than an inert-looking link.
  if (href && !disabled) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    )
  }
  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  )
}
