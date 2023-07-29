import { resolveHref } from "lib/sanity.links"
import Link from "next/link"

const DesktopNavBar = ({ menuItems, showPublications, showPeople, showContactForm }) => {
    return (
        <div 
            className={`sticky top-0 z-10 flex flex-wrap items-center gap-x-5
            uppercase border-y border-primary
            bg-background/80 px-4 py-4 backdrop-blur md:px-16 md:py-5 lg:px-32`}
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
                            className={`text-lg hover:text-black md:text-xl ${menuItem?._type === 'home'
                                ? 'font-extrabold text-black'
                                : 'text-gray-600'
                                }`}
                            href={href}
                        >
                            {menuItem.title}
                        </Link>
                    )
                })
            }

            {/* Custom pages: Publications, Our Team */}
            {showPublications &&
                <Link
                    className={`text-lg hover:text-black md:text-xl text-gray-600`}
                    href={'/publications'}
                >
                    Publications
                </Link>
            }
            {showPeople &&
                <Link
                    className={`text-lg hover:text-black md:text-xl text-gray-600`}
                    href={'/people'}
                >
                    People
                </Link>
            }
            {showContactForm &&
                <Link
                    className={`text-lg hover:text-black md:text-xl text-gray-600`}
                    href={'/contact'}
                >
                    Contact
                </Link>
            }
        </div>
    )
}

export default DesktopNavBar;