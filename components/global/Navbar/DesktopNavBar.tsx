import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { MenuItem } from 'types'

const DesktopNavBar = ({
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}: {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
}) => {
  return (
    <nav
      className={`sticky top-0 z-10 hidden flex-wrap items-center gap-x-5
            border-y border-accent bg-surface/80
            px-4 py-4 uppercase backdrop-blur md:flex md:px-gutter-md md:py-5 lg:px-gutter-lg`}
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
              className={`text-lg hover:text-text md:text-xl ${
                menuItem?._type === 'home'
                  ? 'font-extrabold text-text'
                  : 'text-text-muted'
              }`}
              href={href}
            >
              {href === '/' ? 'Home' : menuItem.title}
            </Link>
          )
        })}

      {/* Custom pages: Publications, Our Team */}
      {showPublications && (
        <Link
          className={`text-lg text-text-muted hover:text-text md:text-xl`}
          href={'/publications'}
        >
          Publications
        </Link>
      )}
      {showPeople && (
        <Link
          className={`text-lg text-text-muted hover:text-text md:text-xl`}
          href={'/people'}
        >
          People
        </Link>
      )}
      {showContactForm && (
        <Link
          className={`text-lg text-text-muted hover:text-text md:text-xl`}
          href={'/contact'}
        >
          Contact
        </Link>
      )}
    </nav>
  )
}

export default DesktopNavBar
