'use client'

import { HIT_AREA, PRESS } from './tokens'

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
// floor is expanded via HIT_AREA (tokens.ts) rather than skipped.

// ON is an ink fill (surface-inverse bg/border, text-inverse text) -- not
// accent. OFF is transparent with a rule-strong border and muted text.
// `PRESS` (tokens.ts) now carries the `.hl-press` class, which bundles the
// scale/transform/background/color/border-color transition in one CSS
// `transition` shorthand -- this element must NOT add its own
// `transition-colors` (or any other `transition-*`) utility alongside it:
// a second Tailwind transition utility on the same element would overwrite
// `.hl-press`'s whole transition-property/-duration/-timing-function triad
// (whichever rule the build emits later wins outright, silently dropping
// the other), which is exactly the bug this component shipped with and had
// fixed at the token source. See tokens.ts's PRESS comment and
// styles/index.css's `.hl-press` comment for the full story.
export function FacetChip({ label, count, on = false, onClick }: FacetChipProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`${HIT_AREA} ${PRESS} font-mono text-[11px] leading-none font-medium tracking-[0.08em] whitespace-nowrap border px-[13px] py-2 ${
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
