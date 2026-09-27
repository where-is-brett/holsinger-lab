'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { type ChangeEvent, type FormEvent, useState } from 'react'

import { FormField } from './FormField'
import { PRESS } from './tokens'

interface Status {
  submitted: boolean
  submitting: boolean
  info: { error: boolean; msg: string | null }
}

interface Inputs {
  name: string
  email: string
  message: string
  _gotcha: string
}

const EMPTY_INPUTS: Inputs = { name: '', email: '', message: '', _gotcha: '' }
const SUCCESS_MESSAGE = 'Thank you for reaching out to us! Your message has been successfully submitted.'
const ERROR_MESSAGE = 'Sorry, there was an issue with submitting your message. Please try again later.'

// The primary action: inverse ink on the inverse surface, a pair guarded in styles/tokens.test.ts.
const SUBMIT = `inline-flex min-h-11 w-full items-center justify-center bg-surface-inverse px-6 font-sans text-[15px] font-medium text-text-inverse disabled:cursor-not-allowed disabled:opacity-[0.45] md:w-auto ${PRESS}`
const DIALOG_CLOSE = `mt-5 inline-flex min-h-11 items-center justify-center bg-surface-inverse px-5 font-sans text-[15px] font-medium text-text-inverse ${PRESS}`

// Off-screen rather than hidden: bots fill every field present in the DOM, and
// visitors never reach it (no tab stop, hidden from assistive tech).
const HONEYPOT_STYLE = { position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 } as const

/**
 * The contact form. It posts `{ name, email, message, _gotcha }` as JSON to
 * `/api/formspree`, which forwards it to Formspree. `idPrefix` keeps field ids
 * unique when more than one form renders on a page (the gallery); the field
 * `name`s, which key the state, never change.
 */
export function ContactForm({ idPrefix = '' }: { idPrefix?: string }) {
  const [status, setStatus] = useState<Status>({
    submitted: false,
    submitting: false,
    info: { error: false, msg: null },
  })
  const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS)

  const handleServerResponse = (ok: boolean, msg: string) => {
    if (ok) {
      setStatus((prev) => ({ ...prev, submitted: true, submitting: false, info: { error: false, msg } }))
      setInputs(EMPTY_INPUTS)
    } else {
      // `submitting` stays true until the dialog is closed.
      setStatus((prev) => ({ ...prev, info: { error: true, msg } }))
    }
  }

  const handleOnChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setInputs((prev) => ({ ...prev, [name]: value }))
    setStatus((prev) => ({ ...prev, submitting: false, info: { error: false, msg: null } }))
  }

  const handleOnSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus((prev) => ({ ...prev, submitting: true }))
    try {
      const response = await fetch('/api/formspree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      if (!response.ok) {
        throw new Error('Formspree request failed')
      }
      handleServerResponse(true, SUCCESS_MESSAGE)
    } catch {
      handleServerResponse(false, ERROR_MESSAGE)
    }
  }

  const handleDialogClose = () => {
    setStatus((prev) => ({ ...prev, submitting: false, info: { error: false, msg: null } }))
  }

  if (status.submitted && status.info.msg) {
    return (
      <p role="status" data-testid="contact-success" className="max-w-[560px] text-lead text-text">
        {status.info.msg}
      </p>
    )
  }

  return (
    <div data-testid="contact-form" className="min-w-0">
      <p className="max-w-[560px] text-body text-text-muted">
        We would love to hear from you! Whether you have a question, suggestion, or just want to say hello, feel
        free to send us a message using the form below.
      </p>
      <form onSubmit={handleOnSubmit} className="mt-6 flex max-w-[560px] flex-col gap-5">
        <input
          type="text"
          name="_gotcha"
          id={`${idPrefix}_gotcha`}
          tabIndex={-1}
          autoComplete="off"
          value={inputs._gotcha}
          onChange={handleOnChange}
          aria-hidden="true"
          style={HONEYPOT_STYLE}
        />
        <FormField
          label="Name"
          id={`${idPrefix}name`}
          name="name"
          autoComplete="name"
          required
          value={inputs.name}
          onChange={handleOnChange}
        />
        <FormField
          label="Email"
          id={`${idPrefix}email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={inputs.email}
          onChange={handleOnChange}
        />
        <FormField
          label="Message"
          id={`${idPrefix}message`}
          name="message"
          textarea
          rows={6}
          required
          value={inputs.message}
          onChange={handleOnChange}
        />
        <div>
          <button type="submit" disabled={status.submitting} className={SUBMIT}>
            {status.submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
      {/* `fixed inset-0`, not `relative`: the centering wrapper below is
          itself `fixed inset-0`, out of flow, so a merely `relative` root
          has no in-flow content and collapses to zero height -- a real box,
          and a `role="dialog"` element with a zero-size box reads as not
          visible (Playwright's actionability checks, some AT). Same trap
          and fix as FilterBar.tsx's own Dialog root. */}
      <Dialog open={status.info.error} onClose={handleDialogClose} className="fixed inset-0 z-50">
        <DialogBackdrop className="fixed inset-0 bg-scrim opacity-60" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-surface-raised p-6">
            <DialogTitle className="font-sans text-[17px] font-semibold">Submission failed</DialogTitle>
            <p className="mt-3 text-body text-text">{status.info.msg}</p>
            <button type="button" onClick={handleDialogClose} className={DIALOG_CLOSE}>
              Close
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
