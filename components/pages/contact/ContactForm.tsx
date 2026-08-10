'use client'
import React, { ChangeEvent, FormEvent, useState } from 'react'

import ErrorDialog from './ErrorDialog'
import SuccessScreen from './SuccessScreen'

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

const ContactForm: React.FC = () => {
  const [status, setStatus] = useState<Status>({
    submitted: false,
    submitting: false,
    info: { error: false, msg: null },
  })

  const [inputs, setInputs] = useState<Inputs>({
    name: '',
    email: '',
    message: '',
    _gotcha: '',
  })

  const handleServerResponse = (ok: boolean, msg: string) => {
    if (ok) {
      setStatus((prevStatus) => ({
        ...prevStatus,
        submitted: true,
        submitting: false,
        info: { error: false, msg: msg },
      }))
      setInputs({
        name: '',
        email: '',
        message: '',
        _gotcha: '',
      })
    } else {
      setStatus((prevStatus) => ({
        ...prevStatus,
        info: { error: true, msg: msg },
      }))
    }
  }

  const handleOnChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    e.persist()
    setInputs((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }))
    setStatus((prevStatus) => ({
      // submitted: false,
      ...prevStatus,
      submitting: false,
      info: { error: false, msg: null },
    }))
  }

  const handleOnSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus((prevStatus) => ({ ...prevStatus, submitting: true }))

    try {
      // Make the POST request to the API route
      const response = await fetch('/api/formspree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      if (!response.ok) {
        throw new Error('Formspree request failed')
      }
      handleServerResponse(
        true,
        'Thank you for reaching out to us! Your message has been successfully submitted.'
      )
    } catch (error) {
      handleServerResponse(
        false,
        'Sorry, there was an issue with submitting your message. Please try again later.'
      )
    }
  }

  // Reset status on error dialog close
  const handleDialogClose = () => {
    setStatus((prevStatus) => ({
      ...prevStatus,
      submitting: false,
      info: { error: false, msg: null },
    }))
  }

  return (
    <>
      {status.submitted ? (
        !status.info.error &&
        status.info.msg && <SuccessScreen message={status.info.msg} />
      ) : (
        <div className="mb-16 flex flex-col items-center space-y-6">
          <h1 className="text-3xl font-[500] md:text-5xl">CONTACT US</h1>
          <form
            onSubmit={handleOnSubmit}
            className="flex w-full max-w-xl flex-col space-y-4 md:w-3/4"
          >
            <input
              type="text"
              name="_gotcha"
              id="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              value={inputs._gotcha}
              onChange={handleOnChange}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0,
              }}
            />
            <p className="font-ariana text-base text-text-muted md:text-lg">
              We would love to hear from you! Whether you have a question,
              suggestion, or just want to say hello, feel free to send us a
              message using the form below.
            </p>
            <div className="flex flex-col space-y-1">
              <label htmlFor="name" className="text-lg font-medium">
                Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                onChange={handleOnChange}
                required
                value={inputs.name}
                className="w-full border border-field px-4 py-2 outline-none focus:border-text-muted"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label htmlFor="email" className="text-lg font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="_replyto"
                onChange={handleOnChange}
                required
                value={inputs.email}
                className="w-full border border-field px-4 py-2 outline-none focus:border-text-muted"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label htmlFor="message" className="text-lg font-medium">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                onChange={handleOnChange}
                required
                value={inputs.message}
                className="w-full border border-field px-4 py-2 outline-none focus:border-text-muted"
                rows={6}
              />
            </div>
            <button
              type="submit"
              disabled={status.submitting}
              className="w-full bg-surface-inverse px-6 py-3 text-text-inverse"
            >
              {!status.submitting
                ? !status.submitted
                  ? 'Submit'
                  : 'Submitted'
                : 'Submitting...'}
            </button>
          </form>

          {/* Show the dialog if showDialog is true */}
          <ErrorDialog
            handleDialogClose={handleDialogClose}
            showDialog={status.info.error}
            message={status.info.msg || ''}
          />
        </div>
      )}
    </>
  )
}

export default ContactForm
