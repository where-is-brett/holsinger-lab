import { Transition } from "@headlessui/react"
import MenuIcon from '@mui/icons-material/Menu';
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
                className="z-30"
            >
                <div
                    className="fixed inset-0 bg-black/50 h-[100lvh]"
                    onClick={handleMenuClick}
                ></div>
            </Transition>

            <div className="mb-6" >
                <div className="z-20 fixed top-0 bottom-auto left-0 right-0 h-16 bg-white border-b">
                    <button type="button" aria-label="button" onClick={handleMenuClick} className="bg-transparent border-0 p-0 absolute left-4 top-1 bottom-1">
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
                            if (!href) {
                                return null
                            }
                            return (
                                <Link
                                    key={key}
                                    className={`text-primary h-[3rem] leading-[3rem] text-xl hover:text-gray-600`}
                                    href={href}
                                >
                                    {href === '/' ? 'Home' : menuItem.title }
                                </Link>
                            )
                        })
                    }
                    {showPublications &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-xl hover:text-gray-600"
                            href={'/publications'}
                        >
                            Publications
                        </Link>
                    }
                    {showPeople &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-xl hover:text-gray-600"
                            href={'/people'}
                        >
                            People
                        </Link>
                    }
                    {showContactForm &&
                        <Link
                            className="text-primary h-[3rem] leading-[3rem] text-xl hover:text-gray-600"
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