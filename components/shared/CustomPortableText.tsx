import { PortableText, PortableTextComponents } from '@portabletext/react'
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
} from '@portabletext/types'
import ImageContainer from 'components/shared/ImageContainer'
import { TimelineSection } from 'components/shared/TimelineSection'
import { resolveInternalLinkHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { Image } from 'sanity'

// `value` accepts `ArbitraryTypedObject` alongside `PortableTextBlock` because these portable
// text arrays embed custom object types (e.g. `timeline`, handled below) that don't have a
// `children` field — the same union `@portabletext/react`'s own `PortableTextProps` defaults to.
// Pinning this to `PortableTextBlock[]` alone doesn't match what the Sanity schema actually
// allows in these fields and fails against the real (generated) payload shapes.
export function CustomPortableText({
  paragraphClasses,
  value,
}: {
  paragraphClasses?: string
  value: (PortableTextBlock | ArbitraryTypedObject)[]
}) {
  /**
   * `paragraphClasses` is optional; interpolating it directly renders the
   * literal string "undefined" as a CSS class when a caller omits it.
   */
  const withParagraphClasses = (...rest: string[]) =>
    [paragraphClasses, ...rest].filter(Boolean).join(' ')

  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => {
        return <p className={withParagraphClasses('my-[1em]')}>{children}</p>
      },
      // Adding block quote
      blockquote: ({ children }) => {
        return (
          <blockquote
            className={`quotes my-[1em] text-left font-serif text-2xl text-text-muted`}
          >
            <span className="pr-2 text-4xl">“</span>
            {children}
            <span className="pl-2 text-4xl">”</span>
          </blockquote>
        )
      },
      h1: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h2 className="my-[0.67em] text-4xl md:text-5xl">{children}</h2>
          </div>
        )
      },
      h2: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h2 className="my-[0.83em] text-3xl md:text-4xl">{children}</h2>
          </div>
        )
      },
      h3: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h3 className="my-[1em] text-2xl md:text-3xl">{children}</h3>
          </div>
        )
      },
      h4: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h4 className="my-[1.33em] text-xl md:text-2xl">{children}</h4>
          </div>
        )
      },
      h5: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h5 className="my-[1.67em] text-lg md:text-xl">{children}</h5>
          </div>
        )
      },
      h6: ({ children }) => {
        return (
          <div className={withParagraphClasses()}>
            <h6 className="my-[2em] text-base md:text-lg">{children}</h6>
          </div>
        )
      },
    },
    marks: {
      link: ({ children, value }) => {
        return (
          <a
            className="text-link underline transition hover:opacity-50"
            href={value?.href}
            rel="noreferrer noopener"
          >
            {children}
          </a>
        )
      },
      internalLink: ({ children, value }) => {
        const href = resolveInternalLinkHref(value)
        if (!href) {
          return <>{children}</>
        }
        return (
          <Link href={href} className="text-link underline transition hover:opacity-50">
            {children}
          </Link>
        )
      },
    },
    list: {
      bullet: ({ children }) => {
        return (
          <ul
            className={withParagraphClasses(
              'my-[1rem]',
              'list-disc',
              'pl-[40px]',
            )}
          >
            {children}
          </ul>
        )
      },
      number: ({ children }) => {
        return (
          <ol
            className={withParagraphClasses(
              'my-[1rem]',
              'list-decimal',
              'pl-[40px]',
            )}
          >
            {children}
          </ol>
        )
      },
    },
    types: {
      image: ({
        value,
      }: {
        value: Image & { alt?: string; caption?: string }
      }) => {
        return (
          <div className="my-6 space-y-2">
            {/* This renderer's wrapping div carries no width constraint of its
                own -- `paragraphClasses` (e.g. max-w-3xl/max-w-4xl) is applied
                by callers only to text blocks, not to this image block, and
                CustomPortableText doesn't thread a `size` prop through from
                its own callers. So this same value has to hold across every
                embedding context. Measured on the one live body image
                (Page.tsx's `body` field, /tutorial): ~79vw at a 1280px
                viewport, i.e. close to the full Layout content column, not a
                separate ~66vw "content column" -- that column doesn't exist
                in the markup. 66vw would under-declare (blurrier) for that
                real case, so this stays 100vw rather than following the
                brief's arithmetic. */}
            <ImageContainer
              image={value}
              alt={value.alt || value.caption || ''}
              size="100vw"
            />
            {value?.caption && (
              <div className="font-antarctican text-sm text-text-muted">
                {value.caption}
              </div>
            )}
          </div>
        )
      },
      timeline: ({ value }) => {
        const { items, hidden } = value || {}
        // Unset means visible: every document published before this field
        // existed has `hidden === undefined`, and those must keep
        // rendering. Only an explicit `true` hides the block.
        if (hidden === true) return null
        return <TimelineSection timelines={items} />
      },
    },
  }

  return <PortableText components={components} value={value} />
}
