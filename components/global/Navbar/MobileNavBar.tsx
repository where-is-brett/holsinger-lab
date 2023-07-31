import { Transition } from '@headlessui/react'
import { resolveHref } from 'lib/sanity.links'
import { Url } from 'next/dist/shared/lib/router/router'
import Image from 'next/image'
import Link from 'next/link'
import router from 'next/router'
import logo from 'public/logo.svg'
import { MenuItem } from 'types'

const hamburgerLine = `h-[2px] w-6 my-[6px] bg-black transition ease transform duration-500`

const MobileNavBar = ({
  handleMenuClick,
  isMenuOpen,
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}) => {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: Url
  ) => {
    e.preventDefault()
    handleMenuClick()
    setTimeout(() => {
      router.push(href)
    }, 500)
  }

  return (
    <>
      <div className={`uppercase`}>
        <div className="fixed bottom-auto left-0 right-0 top-0 z-50 h-16 border-y border-primary bg-background">
          <Link href="/">
            <Image
              src={logo}
              width={120}
              alt="logo"
              className="absolute left-4 my-4 h-[50%]"
            />
          </Link>

          <button
            type="button"
            aria-label="button"
            className="absolute right-6 border-0 bg-transparent py-4"
            onClick={handleMenuClick}
          >
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && 'translate-y-2 rotate-45'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen ? 'opacity-0' : 'group-hover:opacity-100'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && '-translate-y-2 -rotate-45'
              }`}
            />
          </button>
        </div>
        <Transition
          show={isMenuOpen}
          enter="transition ease-out duration-500"
          enterFrom="transform translate-x-full"
          enterTo="transform translate-x-0"
          leave="transition duration-500"
          leaveFrom="transform ease-in translate-x-0"
          leaveTo="transform translate-x-full"
          className="fixed z-20 flex h-[100lvh]
                    w-full flex-col items-center justify-center gap-8
                    bg-background text-center text-2xl font-[400] text-black"
        >
          {menuItems &&
            menuItems.map((menuItem: MenuItem, key: number) => {
              const href = resolveHref(menuItem?._type, menuItem?.slug)
              if (!href) {
                return null
              }
              return (
                <Link
                  key={key}
                  onClick={(e) => {
                    handleLinkClick(e, href)
                  }}
                  className={`hover:text-gray-600`}
                  href={href}
                >
                  {href === '/' ? 'Home' : menuItem.title}
                </Link>
              )
            })}
          {showPublications && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/publications')
              }}
              className="hover:text-gray-600"
              href={'/publications'}
            >
              Publications
            </Link>
          )}
          {showPeople && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/people')
              }}
              className="hover:text-gray-600"
              href={'/people'}
            >
              People
            </Link>
          )}
          {showContactForm && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/contact')
              }}
              className="hover:text-gray-600"
              href={'/contact'}
            >
              Contact
            </Link>
          )}
        </Transition>
      </div>
    </>
  )
}

export default MobileNavBar
