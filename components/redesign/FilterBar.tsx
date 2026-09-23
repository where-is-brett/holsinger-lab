'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect, useState } from 'react'

import { Button } from './Button'
import { activeFilterCount, type FilterOptions, type Filters, NO_FILTERS } from './filterModel'
import { FilterSelects } from './FilterSelects'

export interface FilterBarProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  resultCount: number
  /**
   * Prefix for the desktop row's and the sheet's own select ids. Only one
   * `FilterBar` ever renders per real page (`PublicationsIndex`), so the
   * default is enough there -- this exists because the gallery fixture
   * renders two instances on one page, and a duplicate `id` breaks
   * `<label for>` association (the browser, and `getByLabel`, resolve it to
   * whichever element with that id comes first in the DOM).
   */
  idPrefix?: string
}

const TEXT_BUTTON = 'min-h-11 font-sans text-[15px] font-medium text-link'

export function FilterBar({ options, value, onChange, resultCount, idPrefix = 'filter' }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const active = activeFilterCount(value)
  const clear = () => onChange(NO_FILTERS)
  const results = `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)')
    const onChangeMq = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChangeMq)
    return () => mq.removeEventListener('change', onChangeMq)
  }, [])

  return (
    <div data-testid="filter-bar">
      <p role="status" className="sr-only">
        {results}
      </p>

      <div data-testid="filter-row" className="hidden items-end gap-x-6 md:flex">
        <FilterSelects
          options={options}
          value={value}
          onChange={onChange}
          idPrefix={idPrefix}
          className="grid flex-1 grid-cols-3 gap-x-4"
        />
        {active > 0 && (
          <button type="button" className={TEXT_BUTTON} onClick={clear}>
            Clear
          </button>
        )}
      </div>

      <div className="md:hidden">
        <Button onClick={() => setOpen(true)}>{active > 0 ? `Filter (${active})` : 'Filter'}</Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        // `fixed inset-0`, not `relative` (the plan's own snippet used
        // `relative`): DialogPanel is itself `fixed inset-x-0 bottom-0`, out
        // of flow, so a merely `relative` root has no in-flow content and
        // collapses to zero height -- a real box, and a `role="dialog"`
        // element with a zero-size box reads as not visible (Playwright's
        // actionability checks, some AT). Same trap and fix as
        // MobileHeader.tsx's own Dialog root.
        className="fixed inset-0 z-50"
      >
        {/* Not the scrim utility: styles/tokens.test.ts's token-role misuse
            guard allowlists `--sem-scrim` to
            components/pages/contact/ErrorDialog.tsx only (a deliberate
            one-consumer restriction, not an oversight), so this backdrop
            composes `bg-surface-inverse` with an alpha modifier instead --
            proved with css:proof. */}
        <div className="fixed inset-0 bg-surface-inverse/40" aria-hidden="true" />
        <DialogPanel
          data-testid="filter-sheet"
          className="fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t border-rule bg-surface px-(--spacing-gutter) pt-5 pb-8"
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-sans text-[17px] font-semibold">Filter publications</DialogTitle>
            <button type="button" className={TEXT_BUTTON} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <FilterSelects
            options={options}
            value={value}
            onChange={onChange}
            idPrefix={`${idPrefix}-sheet`}
            className="mt-4 grid grid-cols-1 gap-y-4"
          />
          <div className="mt-6 flex items-center justify-between gap-4">
            {active > 0 ? (
              <button type="button" className={TEXT_BUTTON} onClick={clear}>
                Clear
              </button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={() => setOpen(false)}>
              Show {results}
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  )
}
