'use client'

import { PRESS } from './tokens'

export interface FacetChipProps {
  label: string
  count?: number | string
  on?: boolean
  onClick?: () => void
}

// Visual box matches the vendored source exactly: `padding: 8px 13px` at
// `500 11px/1` mono, a ~29px-tall control. Unlike Tag, a FacetChip is
// unambiguously interactive (a real <button aria-pressed>) and these are
// the primary controls on the publications page, so the 44px accessibility
// floor is expanded via hit area rather than skipped -- same technique as
// Tag.tsx's HIT_AREA and PublicationRow.tsx's Title HIT_AREA: a pseudo-
// element grows the tap target without growing the visual box, which would
// wreck the band's density. `inset-x-0` bounds the expansion to the chip's
// own width so adjacent chips can't steal each other's taps.
const HIT_AREA =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']"

// ON is an ink fill (surface-inverse bg/border, text-inverse text) -- not
// accent. OFF is transparent with a rule-strong border and muted text.
// `hl-press`'s colour/border transitions (components.css) are reproduced as
// Tailwind's own `transition-colors`; the press-scale half is `PRESS` from
// tokens.ts (active:scale-[0.97], duration/easing from the motion tokens).
export function FacetChip({ label, count, on = false, onClick }: FacetChipProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`${HIT_AREA} ${PRESS} font-mono text-[11px] leading-none font-medium tracking-[0.08em] whitespace-nowrap border px-[13px] py-2 transition-colors duration-(--sem-motion-fast) ease-(--sem-ease) ${
        on
          ? 'border-surface-inverse bg-surface-inverse text-text-inverse'
          : 'border-rule-strong bg-transparent text-text-muted'
      }`}
    >
      {label}
      {count != null && <span className="opacity-55"> {count}</span>}
    </button>
  )
}
