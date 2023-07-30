import { Transition } from '@headlessui/react'
import CallIcon from '@mui/icons-material/Call'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import { AddIcon } from '@sanity/icons'
import ImageBox from 'components/shared/ImageBox'
import { useState } from 'react'

const Profile = ({ profile }) => {
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
          alt={`Profile image of ${profile.name}`}
          classesWrapper="relative aspect-[1/1]"
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
          <div className="absolute bottom-0 top-0 flex items-center overflow-y-auto bg-gray-600 bg-opacity-70 p-2">
            <p className="text-center text-white sm:text-sm lg:text-base">
              {profile.bio}
            </p>
          </div>
        </Transition>
      </div>

      {/* Name & role */}
      <div className="flex w-full items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">{profile.name}</h2>
          <p className="text-sm text-gray-600">{profile.role}</p>
        </div>
        {profile.bio && (
          <a className="cursor-pointer" onClick={handleAddIconClick}>
            <AddIcon
              className={`${showBio ? 'rotate-45' : 'rotate-0'} transition-all`}
            />
          </a>
        )}
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-2 text-sm">
        {profile.email && (
          <div className="inline-flex space-x-1">
            <MailOutlineIcon />
            <a href={`mailto:${profile.email}`} className="hover:text-blue-600">
              {profile.email}
            </a>
          </div>
        )}
        {profile.phone && (
          <div className="inline-flex space-x-1">
            <CallIcon />
            <a href={`tel:${profile.phone}`} className="hover:text-blue-600">
              {profile.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
