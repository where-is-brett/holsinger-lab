import { Transition } from '@headlessui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@sanity/icons'

export function Toggle({ show, callback, showMessage, hideMessage }) {
  return (
    <>
      <a onClick={callback} className="underline hover:cursor-pointer">
        {show ? (
          <>
            {hideMessage}
            <ChevronUpIcon className="inline-block h-4 w-4" />
          </>
        ) : (
          <>
            {showMessage}
            <ChevronDownIcon className="inline-block h-4 w-4" />
          </>
        )}
      </a>
    </>
  )
}

export function ToggleContent({ show, children }) {
  return (
    <Transition
      show={show}
      enter="transition ease-in-out transform"
      enterFrom="translate-y-10 opacity-0"
      enterTo="translate-y-0 opacity-100"
      // leave="transition ease-in-out duration-0 transform"
      // leaveFrom="translate-y-0 opacity-100"
      // leaveTo="translate-y-10 opacity-0"
    >
      {children}
    </Transition>
  )
}
