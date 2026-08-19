'use client'

import type { ChangeEvent } from 'react'

export interface FormFieldProps {
  label: string
  hint?: string
  type?: string
  textarea?: boolean
  rows?: number
  placeholder?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  disabled?: boolean
  name?: string
}

// Ported from
// docs/redesign-experiment/design-system/components/content/FormField.jsx.
// 'use client': `onChange` attaches a handler to the host <input>/<textarea>.

// Mono-caps label geometry (500 10px/1, tracking 0.14em) does not match
// tokens.ts's LABEL_BASE (text-label is 11px/0.12em) -- written by hand
// against the vendored numbers rather than reused, same call as
// PageTitle.tsx's own meta line against the brief's suggested META token.
const LABEL_CLASS =
  'block font-mono text-[10px] leading-none font-medium tracking-[0.14em] uppercase text-text-faint'

// Square, transparent, --sem-field-bordered input. `min-h-11` is the 44px
// accessibility floor (already present in the vendored source, not added
// here). `resize-y` only visibly matters on the textarea branch but is
// harmless on <input>, matching the source's shared `resize: "vertical"`
// in one style object for both element types.
//
// The hover border below (`color-mix(in oklab, var(--sem-field) 60%,
// var(--sem-text))`) is a pseudo-class, so it cannot be the inline-style
// treatment used for the two striped placeholders elsewhere in this task --
// pseudo-classes have no inline-style equivalent. Tried as a Tailwind
// arbitrary hover value first and confirmed empirically against the built
// stylesheet (see task report): unlike tokens.ts's PRESS comment (a bracket
// value with a BARE custom-property name, `--sem-motion-fast`, that never
// got var()-wrapped), this value is already valid CSS written directly
// inside the brackets, spaces swapped for underscores -- Tailwind accepts
// that verbatim. It compiles to two rules: an unconditional fallback
// (`border-color: var(--sem-field)`) plus the real `color-mix(...)` value
// gated behind `@supports (color: color-mix(in lab, red, red))`, both
// nested inside `@media (hover: hover)` -- Tailwind's own standard
// progressive-enhancement pattern for any color-mix-based utility, not a
// sign of failure. No hand-written styles/index.css rule was needed.
const INPUT_CLASS =
  'mt-2.5 block w-full min-h-11 resize-y rounded-none border border-field bg-transparent px-3.5 py-3 font-sans text-[15px] leading-[1.5] text-text placeholder:text-text-faint disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-text-faint transition-[border-color] duration-(--sem-motion-fast) ease-(--sem-ease) hover:border-[color-mix(in_oklab,var(--sem-field)_60%,var(--sem-text))]'

function slugify(label: string): string {
  return (label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function FormField({
  label,
  hint,
  type = 'text',
  textarea = false,
  rows = 5,
  placeholder,
  value,
  onChange,
  disabled = false,
  name,
}: FormFieldProps) {
  const id = name || slugify(label)
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={id}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      )}
      {/* The placeholder above is faint decoration, never the only label --
          the visible mono-caps <label> and its htmlFor/id pairing is what
          actually names the field for assistive tech. */}
      {hint && (
        <div className="mt-2 font-mono text-[10px] leading-[1.6] tracking-[0.06em] text-text-faint">
          {hint}
        </div>
      )}
    </div>
  )
}
