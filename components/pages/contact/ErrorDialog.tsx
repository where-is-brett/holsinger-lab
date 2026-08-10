'use client'
import {
  Dialog,
  DialogBackdrop,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react'
import { Fragment } from 'react'

const ErrorDialog = ({
  handleDialogClose,
  showDialog,
  message,
}: {
  handleDialogClose: () => void
  showDialog: boolean
  message: string
}) => {
  return (
    <Transition show={showDialog} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={handleDialogClose}
      >
        <div className="flex min-h-screen items-center justify-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <DialogBackdrop className="fixed inset-0 bg-scrim opacity-60" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="mx-auto max-w-md space-y-5 bg-surface p-4 text-center">
              <DialogTitle as="h3" className="mb-2 text-lg font-semibold">
                Submission Failed
              </DialogTitle>
              <p className="px-4 text-justify text-text">{message}</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDialogClose}
                  className="bg-surface-inverse px-4 py-2 text-text-inverse"
                >
                  Close
                </button>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ErrorDialog
