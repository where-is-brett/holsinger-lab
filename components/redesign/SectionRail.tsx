import type { ReactNode } from 'react'

export interface SectionRailProps {
  num?: string
  label?: string
  inverse?: boolean
  borderTop?: boolean
  pad?: boolean
  padTop?: string
  children?: ReactNode
}

// The direction's structural signature: every screen composes this as a
// [rail | content] grid. Ported from
// docs/redesign-experiment/design-system/components/structure/SectionRail.jsx,
// which is the authority for the markup/values below -- the brief only
// gives props and a partial stub.
export function SectionRail({
  num,
  label,
  inverse = false,
  borderTop = true,
  pad = true,
  padTop = 'var(--spacing-stack)',
  children,
}: SectionRailProps) {
  // An inverse band is separated by its own background, so a top rule would
  // read as a seam. This is why borderTop is ignored when inverse is set.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''

  // The vendored source hardcodes `--spacing-rail` (88px) as the rail width
  // at every viewport. 88px is 23% of a 390px mobile viewport, so that is
  // not mobile-aware -- this narrowing to --spacing-rail-sm (38px) below
  // `md`, widening to --spacing-rail from `md` up, is an addition on top of
  // the port, per the brief's prose.
  const grid = 'grid grid-cols-[var(--spacing-rail-sm)_1fr] md:grid-cols-[var(--spacing-rail)_1fr]'

  return (
    <section className={`${grid} ${surface} ${rule}`}>
      <div
        className={`flex flex-col items-center gap-[18px] border-r ${
          inverse ? 'border-rule-inverse' : 'border-rule'
        }`}
        style={{ paddingTop: padTop }}
      >
        {num && (
          <span
            className={`font-mono text-[13px] leading-none font-medium ${
              inverse ? 'text-link-inverse' : 'text-accent'
            }`}
          >
            {num}
          </span>
        )}
        {label && (
          <span
            className={`[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] leading-none tracking-[0.22em] uppercase ${
              inverse ? 'text-text-inverse-muted' : 'text-text-faint'
            }`}
          >
            {label}
          </span>
        )}
      </div>
      <div
        className={
          pad
            ? 'pt-(--spacing-stack) pr-(--spacing-gutter-lg) pb-(--spacing-stack-lg) pl-(--spacing-gutter-md)'
            : ''
        }
      >
        {children}
      </div>
    </section>
  )
}
