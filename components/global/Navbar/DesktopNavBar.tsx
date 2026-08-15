import Logo from 'components/global/Logo'
import type { LogoImageSource } from 'lib/logo'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { MenuItem } from 'types'

const DesktopNavBar = ({
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
  logo,
  logoDark,
  shortName,
}: {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
  logo?: LogoImageSource | null
  logoDark?: LogoImageSource | null
  shortName: string
}) => {
  return (
    <nav
      className={`sticky top-0 z-10 hidden h-[var(--nav-height)] flex-wrap items-center gap-x-5
            border-y border-accent bg-surface/80
            px-4 uppercase backdrop-blur md:flex md:px-gutter-md lg:px-gutter-lg`}
    >
      {/*
        Desktop had no logo at all before Phase 4B. Adding one is what forces
        the shared --nav-height token: it makes this bar taller, and the
        Publications sticky bar was pinned at a literal 64px (defect D8).
        The row's existing `items-center` centres the 32px logo against the
        28px links with no extra alignment work.
      */}
      <Link href="/" aria-label="Home">
        <Logo logo={logo} logoDark={logoDark} shortName={shortName} />
      </Link>

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
