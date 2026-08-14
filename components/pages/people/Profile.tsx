'use client'
import { Transition } from '@headlessui/react'
import { AddIcon } from '@sanity/icons/Add'
import ImageBox from 'components/shared/ImageBox'
import { useState } from 'react'
import type { ProfilePayload } from 'types'

import { ContactLinks } from './ContactLinks'

const Profile = ({ profile }: { profile: ProfilePayload }) => {
  const [showBio, setShowBio] = useState(false)
  const handleAddIconClick = () => {
    setShowBio(!showBio)
  }

  return (
    <div
      key={profile._id}
      className="mx-auto my-0 flex flex-col items-start gap-4"
    >
      {/* Profile Image */}
      <div className="relative w-full">
        <ImageBox
          image={profile.image}
          width={800}
          height={800}
          // Measured, not the naive "1/3 of the grid" arithmetic: the People
          // grid sits inside Layout's `md:px-gutter-md lg:px-gutter-lg` side
          // padding, which that arithmetic didn't subtract out. Real card
          // width across 768-1536px viewports measures ~23-26vw of the full
          // viewport (e.g. 320px at a 1280px viewport), not 33vw. 28vw covers
          // the measured range with a small safety margin.
          size="(min-width: 768px) 28vw, 100vw"
          alt={`Profile image of ${profile.name}`}
          // A subtle frame plus a grayscale-to-colour hover, design doc
          // §1.2's suggested mitigation for the 19 profile photos'
          // inconsistent backgrounds/crops -- can't fix heterogeneous source
          // photography, but gives every card the same visual treatment.
          // Targets the descendant <img> via an arbitrary variant rather
          // than adding a new prop to the shared ImageBox component, so no
          // other call site is affected.
          classesWrapper="relative aspect-[1/1] rounded border border-rule [&_img]:grayscale [&_img]:transition-all [&_img]:duration-300 hover:[&_img]:grayscale-0"
        />
        {/* Bio Overlay */}
        <Transition
          show={showBio}
          enter="transition duration-300 ease-in-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition duration-300 ease-in-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/*
            Opacity is 85%, not the more common 70%: at 70% this band's
            rendered colour (text-muted blended over the image/placeholder
            beneath it) drops the text-inverse bio text below WCAG AA in
            light mode (3.56:1, computed against the surface-raised
            placeholder colour ImageBox falls back to without a photo).
            85% keeps it at 4.93:1 light / 7.88:1 dark -- see the
            whole-branch-review-fixes report for the full computation.
          */}
          <div className="absolute bottom-0 top-0 flex items-center overflow-y-auto bg-text-muted/85 p-2">
            <p className="text-center text-text-inverse sm:text-sm lg:text-base">
              {profile.bio}
            </p>
          </div>
        </Transition>
      </div>

      {/* Name & role */}
      <div className="flex w-full items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">{profile.name}</h2>
          <p className="text-sm text-text-muted">{profile.role}</p>
        </div>
        {profile.bio && (
          <button
            type="button"
            className="cursor-pointer"
            onClick={handleAddIconClick}
            aria-expanded={showBio}
            aria-label={showBio ? 'Hide bio' : 'Show bio'}
          >
            <AddIcon
              aria-hidden="true"
              className={`${showBio ? 'rotate-45' : 'rotate-0'} transition-all`}
            />
          </button>
        )}
      </div>

      {/* Contact */}
      <ContactLinks email={profile.email} phone={profile.phone} />
    </div>
  )
}

export default Profile
