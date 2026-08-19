'use client'
import { Dialog, DialogPanel } from '@headlessui/react'
import Logo from 'components/global/Logo'
import { getAspectRatio, type LogoImageSource, resolveLogo } from 'lib/logo'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MenuItem } from 'types'

const hamburgerLine = `h-[2px] w-6 my-[6px] bg-text transition ease transform duration-500`

const MobileNavBar = ({
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = () => {
    setIsMenuOpen((open) => !open)
  }

  const closeMenu = () => setIsMenuOpen(false)

  // The transparent tap-overlay below takes its width from this call to
  // resolveLogo. The visible logo (rendered by <Logo> below) makes its own,
  // independent call to that same pure function with the same aspectRatio/
  // shortName inputs, so the two widths cannot drift apart even though
  // neither call's result is passed to the other -- which is what keeps the
  // Phase 2C overlay mitigation intact once the logo becomes CMS-editable
  // and its aspect ratio stops being a constant. See lib/logo.ts.
  const logoGeometry = resolveLogo({
    aspectRatio: getAspectRatio(logo),
    shortName,
  })

  return (
    <>
      <nav className="uppercase md:hidden">
        <div className="border-accent bg-surface fixed bottom-auto left-0 right-0 top-0 z-50 h-[var(--nav-height)] border-y">
          {/*
            This logo link is a sibling of <Dialog>, so - like the hamburger
            button below - it goes `inert`+`aria-hidden` while the menu is
            open (Headless UI's useInertOthers makes everything outside the
            Dialog's own portaled tree inert while it's open). It keeps
            painting normally (`inert` doesn't affect paint) but is silently
            unclickable while open. A transparent Link at this same screen
            position is what actually receives the tap and navigates home
            while the menu is open - but unlike the hamburger/close button
            pair, that Link has to live *inside <DialogPanel>* itself, not
            merely inside <Dialog>. See its comment (near the bottom of
            <DialogPanel>'s children) for why: it's not a stylistic choice,
            it's required for the tap to actually navigate on touch input.
          */}
          <Link href="/">
            {/*
              The logo's three render modes live in components/global/Logo.tsx.
              Wordmark mode is still inline SVG themed with
              `stroke="currentColor"` -- that is what lets it pick up the same
              token-driven colour as the hamburger bars (`bg-text`) and stay
              visible against `bg-surface` in both colour schemes. Image mode
              cannot use `currentColor` (it is a bitmap or an external SVG), so
              a dark-scheme variant is handled by the `.logo-light`/`.logo-dark`
              pair in styles/index.css instead. Both modes carry the accessible
              name "logo".
            */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <Logo logo={logo} logoDark={logoDark} shortName={shortName} />
            </span>
          </Link>

          {/*
            This button's visible icon is the only one the user ever sees,
            but while the menu is open it is `inert` (see the comment on the
            overlay button inside <Dialog> below) and purely decorative -
            the overlay button is what actually receives the click. Per the
            HTML spec, `inert` elements are excluded from pointer-event
            hit-testing, so a click that physically lands on this
            visually-on-top-but-inert button passes through it to whatever
            is painted directly beneath it at those screen coordinates - the
            transparent overlay button inside <Dialog>. Verified on Chromium
            and real WebKit (Mobile Safari device profile); untested on
            Firefox but expected to work, since this is standard,
            spec-mandated hit-testing behavior rather than a browser quirk.
            Regression-guarded by the geometry-click test "tapping the
            visible header icon..." in e2e/mobile-menu.spec.ts. Its
            `right-6` position and this header bar's height (the shared
            `--nav-height` token) must stay in sync with the overlay
            button's `right-6 top-0 h-[var(--nav-height)] w-9`, or the
            click-passthrough geometry breaks and the visible icon goes
            dead.
          */}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            // Vertical padding derives from --nav-height rather than a fixed
            // py-4. The three hamburgerLine bars stack (with collapsed
            // margins) to a fixed 1.875rem/30px, and the bar around this
            // button has a 1px top+bottom border (border-y, border-box
            // sizing), so its inner content box is (nav-height - 2px) tall.
            // padding-top/bottom of ((nav-height - 2px) - 1.875rem)/2 fills
            // that content box flush -- exactly what the old py-4 (16px)
            // did at the old 4rem --nav-height ((64px-2px-30px)/2 = 16px),
            // just expressed as a formula instead of a number frozen to one
            // --nav-height value. Keeps this button's rendered box flush
            // inside the bar (and therefore inside the overlay button's
            // explicit h-[var(--nav-height)] below, which starts at the
            // bar's outer edge and so is 2px taller -- see the
            // geometry-coupling comment above and on that overlay button)
            // at every breakpoint, not just the one py-4 happened to fit.
            className="absolute right-6 border-0 bg-transparent py-[calc((var(--nav-height)_-_2px_-_1.875rem)/2)]"
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
        <Dialog
          open={isMenuOpen}
          onClose={closeMenu}
          transition
          unmount={false}
          aria-label="Mobile menu"
          className="data-closed:pointer-events-none fixed inset-0 z-20 md:hidden"
        >
          {/*
            Headless UI's Dialog makes everything outside its own portaled
            tree `inert`+`aria-hidden` while open (see useInertOthers) -
            including the always-visible header button and logo link above,
            since both live outside <Dialog>. Those elements therefore
            become unclickable/unfocusable/invisible-to-a11y-tree the
            moment the menu opens, even though they still visually render
            (inert doesn't affect paint, only interaction+a11y). Per the
            HTML spec, `inert` elements are excluded from pointer-event
            hit-testing, so a click that physically lands on the
            visually-on-top-but-inert header button passes through it to
            this button - the *real* close control while open: it's part
            of the Dialog's own tree (so it stays interactive and
            focus-trap/tab-order-participating), and it's positioned to
            exactly overlay the header button's hit area so the single
            visible "X" icon underneath remains the only thing the user
            perceives, while this transparent button is what actually
            receives the click/tap/keyboard activation. The header logo
            uses a *related but not identical* pattern - it has to sit
            inside <DialogPanel> rather than here as a Dialog-level sibling
            of DialogPanel, because unlike this button's job (closing the
            menu, which happens automatically via outside-click regardless
            of whether this onClick fires), the logo's job is navigation,
            which does NOT happen automatically and is specifically
            suppressed by touch input when the element lives here instead
            of inside DialogPanel. See the logo overlay's own comment
            (inside <DialogPanel>'s children) for the full mechanism.
            Verified on Chromium and real WebKit (Mobile Safari device
            profile);
            untested on Firefox but expected to work, since this is
            standard, spec-mandated hit-testing behavior rather than a
            browser quirk. Regression-guarded by the geometry-click test
            "tapping the visible header icon..." in
            e2e/mobile-menu.spec.ts.

            Geometry coupling: `right-6 top-0 h-[var(--nav-height)] w-9`
            must stay in sync with the header button's own `right-6`
            position and the header bar's height, both now the shared
            `--nav-height` token (see the comment on that button above) -
            if either drifts, the visible icon and the actual clickable
            area fall out of alignment and the icon becomes dead to clicks.
            `z-30` (vs. the Dialog wrapper's `z-20`) is needed so this
            button sits above `DialogPanel` within the Dialog's own
            stacking context, since DialogPanel covers the full viewport.
          */}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label="Close menu"
            className="absolute right-6 top-0 z-30 h-[var(--nav-height)] w-9 border-0 bg-transparent"
            onClick={closeMenu}
          />
          <DialogPanel
            id="mobile-menu-panel"
            transition
            className="bg-surface data-closed:translate-x-full data-enter:ease-out data-leave:ease-in fixed inset-0 flex
                      h-[100lvh] w-full flex-col items-center justify-center
                      gap-8 text-center text-2xl font-[400]
                      text-text transition duration-500"
          >
            {/*
              Same visual-overlay purpose as the close button above (make
              the *visible* header logo tappable while the menu is open,
              since the real logo <Link> above is a sibling of <Dialog>
              and goes `inert`) - but this element must be an actual DOM
              child of <DialogPanel> itself, not merely of <Dialog> like
              the close button (where it used to live too, as a sibling of
              this DialogPanel). That's not a style preference, it fixes a
              real bug found by building a live repro against this repo's
              installed @headlessui/react@2.2.10 + React 19:

              Headless UI's outside-click handling (`useOutsideClick`,
              which backs "click/tap outside the panel closes the dialog")
              calls `event.preventDefault()` on the `touchend` event for
              anything outside its `resolveContainers()` list, and that
              list resolves to DialogPanel's own subtree - a sibling of
              DialogPanel (even though it's inside <Dialog>) counts as
              "outside" and gets this treatment. `preventDefault()` on
              `touchend` suppresses the `click` event a touchscreen tap
              would otherwise synthesize afterward, so on real touch input
              specifically (not mouse) a sibling-of-DialogPanel overlay's
              own onClick/navigation never fires - even though the same
              tap still closes the menu, because that part happens via
              Headless UI's own outside-click-closes-dialog behavior,
              independent of this element's onClick.

              That was harmless for the close button above: its only job
              (`closeMenu`) already happens automatically on outside-click
              regardless of whether the button's own onClick fires. It is
              NOT harmless here: this element's job is navigating home,
              which does not happen automatically - it specifically
              requires this Link's own onClick/navigation to fire, exactly
              what touch input was suppressing while this lived outside
              DialogPanel. Being an actual child of DialogPanel puts it
              inside resolveContainers(), so it's never "outside" and its
              click handler fires normally for both mouse and touch.
              Verified on Chromium and real WebKit (Mobile Safari device
              profile) via the live repro above.

              Tradeoff accepted: DialogPanel carries a translate-x
              transform for its ~500ms open/close transition
              (`data-closed:translate-x-full`). A transform on an ancestor
              establishes a new containing block for descendants
              (including this absolutely-positioned Link), so this
              element's screen position only matches the real logo once
              the panel finishes sliding to translate-x-0 - i.e. for the
              entire time the menu is fully open, not during the brief
              slide itself. The close button above has the same class of
              imprecision, unaddressed; this doesn't worsen it, just
              doesn't fix it either.

              Geometry coupling: this element's height comes from the same
              `--nav-height` token as the header bar (see the comment on the
              visible logo near the top of this file), and its width from
              `logoGeometry` above -- a second, independent call to the same
              pure `resolveLogo` function that sizes the visible logo, given
              the same `aspectRatio`/`shortName` inputs, so it cannot resolve
              to a different number. Both couplings are now structural (one
              token, one function) rather than comment-enforced, but they
              still have to hold: if either drifts, the visible logo and the
              actual tappable area fall out of alignment and the logo goes dead to
              taps/clicks. `left-4` still has to match the header logo's own
              `left-4` position. `z-10` keeps it above the menu links below
              in DOM/paint order, in case their boxes ever overlap this
              fixed header-sized area on a very short viewport. `onClick={closeMenu}`
              here is load-bearing (not redundant with outside-click)
              precisely because this element is now *inside* the dialog, so
              tapping it doesn't count as an outside tap - closing still has
              to come from its own handler. Regression-guarded by the
              "tapping the visible logo..." touch-tap test in
              e2e/mobile-menu.spec.ts.
            */}
            <Link
              href="/"
              onClick={closeMenu}
              aria-label="Home"
              className="absolute left-4 top-0 z-10 h-[var(--nav-height)]"
              // Tailwind arbitrary values cannot take a runtime variable, so
              // this width is an inline style. It is the SAME number the
              // visible logo renders at -- see logoGeometry above.
              style={{ width: logoGeometry.width }}
            />
            {menuItems &&
              menuItems.map((menuItem: MenuItem, key: number) => {
                const href = resolveHref(menuItem?._type, menuItem?.slug)
                if (!href) {
                  return null
                }
                return (
                  <Link
                    key={key}
                    onClick={closeMenu}
                    className={`hover:text-text-muted`}
                    href={href}
                  >
                    {href === '/' ? 'Home' : menuItem.title}
                  </Link>
                )
              })}
            {showPublications && (
              <Link
                onClick={closeMenu}
                className="hover:text-text-muted"
                href={'/publications'}
              >
                Publications
              </Link>
            )}
            {showPeople && (
              <Link
                onClick={closeMenu}
                className="hover:text-text-muted"
                href={'/people'}
              >
                People
              </Link>
            )}
            {showContactForm && (
              <Link
                onClick={closeMenu}
                className="hover:text-text-muted"
                href={'/contact'}
              >
                Contact
              </Link>
            )}
          </DialogPanel>
        </Dialog>
      </nav>
    </>
  )
}

export default MobileNavBar
