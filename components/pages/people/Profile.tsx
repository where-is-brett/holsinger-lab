import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CallIcon from '@mui/icons-material/Call';
import { AddIcon } from '@sanity/icons'
import { useState } from "react";
import { Transition } from "@headlessui/react";
import ImageBox from "components/shared/ImageBox";

const Profile = ({ profile }) => {

    const [showBio, setShowBio] = useState(false);
    const handleAddIconClick = () => {
        setShowBio(!showBio);
    };


    return (
        <div key={profile._id} className="flex items-start flex-col gap-4 mx-auto my-0">

            {/* Profile Image */}
            <div className="relative w-full">
                {/* <img
                    className="w-full"
                    src={imageURL}
                    alt={profile.name}
                /> */}
                <ImageBox
                    image={profile.image}
                    width={1000}
                    height={1000}
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
                    <div className="absolute top-0 bottom-0 bg-gray-600 bg-opacity-70 flex items-center p-2 overflow-y-auto">
                        <p className="text-white text-center sm:text-sm lg:text-base">{profile.bio}</p>
                    </div>
                </Transition>

            </div>


            {/* Name & role */}
            <div className="flex justify-between items-baseline w-full">
                <div>
                    <h2 className="text-lg font-semibold">{profile.name}</h2>
                    <p className="text-sm text-gray-600">{profile.role}</p>
                </div>
                {profile.bio && (
                    <a
                        className="cursor-pointer"
                        onClick={handleAddIconClick}
                    >
                        <AddIcon className={`${showBio ? 'rotate-45' : 'rotate-0'} transition-all`} />
                    </a>)}

            </div>

            {/* Contact */}
            <div className="text-sm flex flex-col gap-2">
                {profile.email &&
                    <div className="inline-flex space-x-1">
                        <MailOutlineIcon />
                        <a href={`mailto:${profile.email}`} className="hover:text-blue-600">{profile.email}</a>
                    </div>
                }
                {profile.phone &&
                    <div className="inline-flex space-x-1">
                        <CallIcon />
                        <a href={`tel:${profile.phone}`} className="hover:text-blue-600">{profile.phone}</a>
                    </div>
                }
            </div>
        </div>

    )
}

export default Profile;