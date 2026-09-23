import type { ReactNode } from 'react'

import { CONTROL_BASE, HAIRLINE, PRESS } from './tokens'

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  active?: boolean
  /** `'primary'` is the ON-chip ink fill (spec's primary CTA); default is the outline button. */
  variant?: 'default' | 'primary'
  /** Opens `href` in a new tab with rel="noopener noreferrer". */
  external?: boolean
}

// CONTROL_BASE, not LABEL_BASE: a button's own text is caller content
// (e.g. "Clear filters"), never a data column head. It gives the mono
// font/size with no colour baked in -- Button's rest colour is text-muted,
// and `active` swaps colour and border to the link/accent colour, so those
// two utilities are chosen per branch below rather than layered on top of a
// fixed class -- otherwise two same-property utilities (e.g.
// border-rule-strong and border-link) would sit in the class list together,
// and which one wins would depend on Tailwind's generation order, not on
// `active`.
const SHAPE = `inline-flex min-h-11 items-center justify-center px-4 ${CONTROL_BASE} leading-none bg-transparent`

// A complete, separate class string for `variant="primary"` -- never layered
// on `SHAPE`, which sets the mono font/size and `bg-transparent`. Sentence-
// case Archivo (this is caller content, e.g. "Read paper"), the ON-chip ink
// fill (`bg-surface-inverse`/`text-text-inverse`), already contrast-guarded
// in styles/tokens.test.ts. `active` has no meaning here -- there is no
// second state to distinguish -- so it's ignored for this variant.
const PRIMARY =
  'inline-flex min-h-11 items-center justify-center gap-2 px-5 font-sans text-[15px] leading-none font-medium border border-surface-inverse bg-surface-inverse text-text-inverse hl-press active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.45]'

export function Button({
  children,
  onClick,
  href,
  disabled = false,
  active = false,
  variant = 'default',
  external = false,
}: ButtonProps) {
  if (variant === 'primary') {
    if (href && !disabled) {
      return external ? (
        <a className={PRIMARY} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <a className={PRIMARY} href={href}>
          {children}
        </a>
      )
    }
    return (
      <button className={PRIMARY} onClick={onClick} disabled={disabled} type="button">
        {children}
      </button>
    )
  }

  const border = active ? 'border border-link' : HAIRLINE
  const color = active ? 'text-link' : 'text-text-muted'
  const className = `${SHAPE} ${border} ${color} ${PRESS} disabled:cursor-not-allowed disabled:opacity-[0.45]`

  // Anchors have no disabled semantics, so a disabled+href button still
  // renders as a real <button disabled> rather than an inert-looking link.
  if (href && !disabled) {
    return external ? (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
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
