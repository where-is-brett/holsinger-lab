'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { HeroSlideView, HomeHeroView } from './heroModel'

// Home's picture banner, the one client island on Home: everything around
// it (eyebrow, heading, statement, lab-head card) is server-rendered by
// HomeHero.tsx and, for the full-bleed layout, handed in as `overlay`.
//
// Accessibility (WCAG 2.2.2, APG carousel pattern): a visible Pause/Play
// button whenever the slides rotate on their own; rotation also stops
// while the pointer is over it, while keyboard focus is inside it, while
// the tab is hidden, while it's scrolled off-screen, and never starts at
// all under `prefers-reduced-motion: reduce`. Slide changes are announced
// (polite) only when the visitor moves the carousel themselves.

export const HERO_INTERVAL_MS = 6000

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

// Server snapshots assume the common case (motion allowed, tab visible), so
// the Pause button is in the server HTML for most visitors and the row
// doesn't shift on hydration.
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false)
const noSubscribe = () => () => {}
const useHydrated = () =>
  useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  )
const useDocumentHidden = () =>
  useSyncExternalStore(subscribeVisibility, () => document.visibilityState === 'hidden', () => false)

// A horizontal swipe at least this long (px), and wider than it is tall,
// changes slide. `touch-action: pan-y` on the swipe surface keeps vertical
// page scrolling native while handing horizontal drags to these handlers.
const SWIPE_MIN = 40

// The picture box is a fixed height at every width (never sized by the
// image), so nothing below it moves as slides load. `media-frame` is the
// site-wide dark-scheme dim (styles/index.css), on the wrapper so it never
// collides with a filter on the <img> itself.
const SPLIT_FRAME =
  'media-frame relative -mx-(--spacing-gutter) h-[210px] touch-pan-y overflow-hidden bg-[#05070b] md:-mr-(--spacing-gutter-lg) md:-ml-(--spacing-gutter-md) md:h-[360px] lg:mx-0 lg:h-[520px]'
const BAND_FRAME = 'media-frame absolute inset-0 overflow-hidden bg-[#05070b]'

// Full-bleed scrims: left-to-right from `md`, bottom-to-top on phones
// (where the heading sits low over the picture). The extra bottom wash on
// wide screens keeps the white controls, which sit over the bright right
// side of the picture, legible.
const SCRIM_PHONE =
  'linear-gradient(0deg, rgba(5, 7, 11, 0.9), rgba(5, 7, 11, 0.5) 55%, rgba(5, 7, 11, 0.1))'
const SCRIM_WIDE =
  'linear-gradient(0deg, rgba(5, 7, 11, 0.55), rgba(5, 7, 11, 0) 30%), linear-gradient(90deg, rgba(5, 7, 11, 0.84), rgba(5, 7, 11, 0.5) 45%, rgba(5, 7, 11, 0) 80%)'

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      {direction === 'left' ? <path d="M13 8H3m4-4L3 8l4 4" /> : <path d="M3 8h10M9 4l4 4-4 4" />}
    </svg>
  )
}

function PauseIcon({ paused }: { paused: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      {paused ? <path d="M4.5 3v10l8.5-5z" /> : <path d="M4 3h3v10H4zM9 3h3v10H9z" />}
    </svg>
  )
}

function Caption({ slide, inverse, active }: { slide: HeroSlideView; inverse: boolean; active: boolean }) {
  if (!slide.caption) return null
  const tone = inverse ? 'text-[#f5f7f9] decoration-white/40' : 'text-text decoration-rule-strong'
  // Every slide's caption sits in the same grid cell (see `Captions`); only
  // the showing one is visible, focusable and in the accessibility tree.
  // A text underline rather than a bottom border, so a caption that wraps
  // is underlined line by line, and `self-start` so a short caption isn't
  // stretched to the tallest one's height.
  const className = `min-w-0 self-start justify-self-start text-[0.8125rem] leading-[1.4] font-medium break-words underline decoration-1 underline-offset-[5px] [grid-area:1/1] ${tone} ${
    active ? '' : 'invisible'
  }`
  const shared = { 'data-testid': active ? 'home-hero-caption' : undefined, 'data-cms-verbatim': true, 'aria-hidden': active ? undefined : true }
  if (!slide.href) {
    return (
      <span {...shared} className={className}>
        {slide.caption}
      </span>
    )
  }
  const text = `${slide.caption} →`
  const linkClass = `${className} transition-[text-decoration-color] duration-(--sem-motion-fast) ease-(--sem-ease) ${
    inverse ? 'hover:decoration-white' : 'hover:decoration-text'
  }`
  return slide.href.startsWith('/') ? (
    <Link {...shared} href={slide.href} className={linkClass}>
      {text}
    </Link>
  ) : (
    <a {...shared} href={slide.href} className={linkClass}>
      {text}
    </a>
  )
}

// All captions stacked in one grid cell, so the row is always as tall as
// the longest one: a two-line caption on a phone never pushes the page
// down when its slide comes round.
function Captions({ slides, index, inverse }: { slides: HeroSlideView[]; index: number; inverse: boolean }) {
  return (
    <div className="grid min-w-0">
      {slides.map((slide, i) => (
        <Caption key={slide.key} slide={slide} inverse={inverse} active={i === index} />
      ))}
    </div>
  )
}

export function HeroCarousel({ hero, overlay }: { hero: HomeHeroView; overlay?: ReactNode }) {
  const { slides, layout } = hero
  const count = slides.length
  const multiple = count > 1
  const fullBleed = layout === 'fullBleed'

  const [index, setIndex] = useState(0)
  // Every slide that has been showing. Its picture stays mounted from then
  // on (at most six), so a slide still fading out is never unmounted
  // mid-crossfade by a second quick click or swipe.
  const [shown, setShown] = useState<ReadonlySet<number>>(() => new Set([0]))
  const moveTo = useCallback((next: number) => {
    setIndex(next)
    setShown((prev) => (prev.has(next) ? prev : new Set(prev).add(next)))
  }, [])
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const reducedMotion = useReducedMotion()
  const hidden = useDocumentHidden()
  const hydrated = useHydrated()
  const frameRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const rotates = hero.autoplay && multiple && !reducedMotion
  const running = rotates && !userPaused && !hovered && !focused && !hidden && onScreen

  // The server HTML carries the first picture alone. After hydration the
  // current slide's two neighbours load too, ready for the crossfade, and
  // any slide already shown stays mounted.
  const mounted = (i: number) =>
    shown.has(i) || (hydrated && (i === (index + 1) % count || i === (index - 1 + count) % count))

  // A fresh timer per slide, so a manual move always gets a full interval.
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => {
      setAnnouncement('')
      moveTo((index + 1) % count)
    }, HERO_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [running, index, count, moveTo])

  useEffect(() => {
    const frame = frameRef.current
    if (!rotates || !frame || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(frame)
    return () => observer.disconnect()
  }, [rotates])

  const go = useCallback(
    (step: 1 | -1) => {
      const next = (index + step + count) % count
      const caption = slides[next].caption
      moveTo(next)
      setAnnouncement(`Slide ${next + 1} of ${count}${caption ? `: ${caption}` : ''}`)
    },
    [index, count, slides, moveTo]
  )

  const onPointerDown = (e: PointerEvent) => {
    if (!multiple || e.pointerType === 'mouse') return
    swipeStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
  }
  const swipeHandlers = multiple
    ? {
        onPointerDown,
        onPointerUp,
        onPointerCancel: () => {
          swipeStart.current = null
        },
      }
    : {}

  // Hover is a mouse thing: a tap fires pointerenter with no matching
  // pointerleave, which would otherwise leave a phone's carousel paused.
  const hoverHandlers = rotates
    ? {
        onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && setHovered(true),
        onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && setHovered(false),
      }
    : {}
  // Keyboard focus only (`:focus-visible`): clicking an arrow with a mouse
  // focuses it in Chromium, and that shouldn't stop the slideshow.
  const focusHandlers = rotates
    ? {
        onFocus: (e: FocusEvent) => {
          if ((e.target as HTMLElement).matches(':focus-visible')) setFocused(true)
        },
        onBlur: (e: FocusEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
        },
      }
    : {}

  const sizes = fullBleed ? '100vw' : '(min-width: 1024px) 40vw, 100vw'

  const slideLayers = slides.map((slide, i) => {
    const active = i === index
    return (
      <div
        key={slide.key}
        data-testid="home-hero-slide"
        data-active={active}
        {...(multiple
          ? { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${count}` }
          : {})}
        aria-hidden={active ? undefined : true}
        inert={!active}
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out motion-reduce:transition-none ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {mounted(i) && (
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes={sizes}
            preload={i === 0}
            loading={i === 0 ? undefined : 'lazy'}
            className="object-cover"
            style={{ objectPosition: slide.objectPosition }}
          />
        )}
      </div>
    )
  })

  const control = fullBleed
    ? 'border-white/60 bg-black/25 text-white hover:bg-black/45'
    : 'border-rule-strong text-text hover:bg-surface-raised'
  const controlClass = `flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[background-color] duration-(--sem-motion-fast) ease-(--sem-ease) ${control}`
  const dot = fullBleed ? ['bg-white/35', 'bg-white'] : ['bg-rule-strong', 'bg-text']

  const showRow = multiple || Boolean(slides[0].caption)
  const row = showRow && (
    <div
      data-testid="home-hero-controls"
      className={`flex items-center justify-between gap-3 ${
        fullBleed ? 'max-md:flex-col max-md:items-start' : 'mt-3'
      }`}
    >
      <Captions slides={slides} index={index} inverse={fullBleed} />
      {multiple && (
        <div className="flex shrink-0 items-center gap-2">
          {rotates && (
            <button
              type="button"
              data-testid="home-hero-pause"
              aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
              className={controlClass}
              onClick={() => setUserPaused((p) => !p)}
            >
              <PauseIcon paused={userPaused} />
            </button>
          )}
          {/* Position dots are decorative: each slide's own "2 of 4"
              label carries the same fact for assistive tech. Hidden on a
              phone in the split layout, as in the approved mockup. */}
          <span aria-hidden="true" className={`mx-1 gap-1.5 ${fullBleed ? 'flex' : 'hidden lg:flex'}`}>
            {slides.map((slide, i) => (
              <span key={slide.key} className={`h-1.5 w-1.5 rounded-full ${i === index ? dot[1] : dot[0]}`} />
            ))}
          </span>
          <button
            type="button"
            data-testid="home-hero-prev"
            aria-label="Previous slide"
            className={controlClass}
            onClick={() => go(-1)}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            data-testid="home-hero-next"
            aria-label="Next slide"
            className={controlClass}
            onClick={() => go(1)}
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      )}
    </div>
  )

  const live = multiple && (
    <p data-testid="home-hero-live" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  )

  const regionProps = multiple
    ? {
        role: 'region',
        'aria-roledescription': 'carousel',
        'aria-label': 'Pictures from the lab',
        ...focusHandlers,
      }
    : {}

  if (fullBleed) {
    // The band cancels Layout's `mt-20 md:mt-16` (components/shared/
    // Layout.tsx) so it sits directly under the sticky header. The region
    // itself stays statically positioned, so its absolutely placed
    // pictures and scrims fill the band (z 0-1) while its controls row
    // flows at the bottom, under the overlaid heading (z 2) -- the heading
    // comes first in reading order and sits outside the carousel region,
    // not inside one of its slides.
    return (
      <div
        data-testid="home-hero-band"
        className="relative -mt-20 flex h-[470px] touch-pan-y flex-col justify-end overflow-hidden px-(--spacing-gutter) pb-5 md:-mt-16 md:h-[540px] md:pr-(--spacing-gutter-lg) md:pb-10 md:pl-(--spacing-gutter-md)"
        {...swipeHandlers}
        {...hoverHandlers}
      >
        <div className="relative z-[2] text-[#f5f7f9]">{overlay}</div>
        <div data-testid="home-hero-carousel" data-layout="fullBleed" {...regionProps}>
          <div ref={frameRef} data-testid="home-hero-media" className={`${BAND_FRAME} z-0`}>
            {slideLayers}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] md:hidden"
            style={{ backgroundImage: SCRIM_PHONE }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] max-md:hidden"
            style={{ backgroundImage: SCRIM_WIDE }}
          />
          {row && <div className="relative z-[2] mt-[18px]">{row}</div>}
          {live}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="home-hero-carousel" data-layout="split" {...regionProps} {...hoverHandlers}>
      <div ref={frameRef} data-testid="home-hero-media" className={SPLIT_FRAME} {...swipeHandlers}>
        {slideLayers}
      </div>
      {row}
      {live}
    </div>
  )
}
