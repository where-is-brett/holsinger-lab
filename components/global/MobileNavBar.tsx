import { Transition } from "@headlessui/react"
import { MenuIcon } from '@sanity/icons'
import { resolveHref } from "lib/sanity.links"
import Link from "next/link"

const MobileNavBar = ({
    handleMenuClick, isMenuOpen,
    menuItems, showPublications, showPeople, showContactForm
}) => {

    return (
        <>
            {/* Dimming overlay */}
            <Transition
                show={isMenuOpen}
                enter="transition-opacity duration-500 ease-in-out"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-500 ease-in-out"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                className=" z-30"
            >
                <div
                    className="fixed inset-0 bg-black/50"
                    onClick={handleMenuClick}
                ></div>
            </Transition>

            <div className="mb-6" >
                <div className="z-20 fixed top-0 bottom-auto left-0 right-0 h-16 bg-white border-b">
                    <button type="button" onClick={handleMenuClick} className="bg-transparent border-0 p-0 absolute left-4 top-1 bottom-1">
                        {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg> */}
                        <MenuIcon />
                    </button>
                </div>
                <Transition
                    show={isMenuOpen}
                    enter="transition duration-500"
                    enterFrom="transform translate-x-[250%]"
                    enterTo="transform translate-x-[150%]"
                    leave="transition duration-500"
                    leaveFrom="transform translate-x-[150%]"
                    leaveTo="transform translate-x-[250%]"
                    className={'fixed w-[40vw] bg-white text-right pt-7 pr-4 top-0 bottom-0 flex flex-col z-50'}
                >
                    {menuItems &&
                        menuItems.map((menuItem, key) => {
                            const href = resolveHref(menuItem?._type, menuItem?.slug)
                            if (!href || href === '/') {
                                return null
                            }
                            return (
                                <Link
                                    key={key}
                                    className={`text-primary h-[3rem] leading-[3rem] text-2xl hover:text-gray-600`}
                                    href={href}
                                >
                                    {menuItem.title}
                                </Link>
                            )
                        })
                    }
                    {showPublications &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-2xl hover:text-gray-600"
                            href={'/publications'}
                        >
                            Publications
                        </Link>
                    }
                    {showPeople &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-2xl hover:text-gray-600"
                            href={'/people'}
                        >
                            People
                        </Link>
                    }
                    {showContactForm &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-2xl hover:text-gray-600"
                            href={'/contact'}
                        >
                            Contact
                        </Link>
                    }
                </Transition>
            </div>

        </>
    )

}

export default MobileNavBar;