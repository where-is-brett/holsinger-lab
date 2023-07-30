import { PortableText, PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import ImageContainer from 'components/shared/ImageContainer'
import { TimelineSection } from 'components/shared/TimelineSection'
import type { Image } from 'sanity'

export function CustomPortableText({
  paragraphClasses,
  value,
}: {
  paragraphClasses?: string
  value: PortableTextBlock[]
}) {
  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => {
        return (
          <>
            <p className={`${paragraphClasses} my-[1em]`}>{children}</p>
          </>
        )
      },
      // Adding block quote
      blockquote: ({ children }) => {
        return (
          <blockquote
            className={`quotes my-[1em] text-left font-serif text-2xl text-gray-600`}
          >
            <span className="pr-2 text-4xl">“</span>
            {children}
            <span className="pl-2 text-4xl">”</span>
          </blockquote>
        )
      },
      h1: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h1 className="my-[0.67em] text-4xl md:text-5xl">{children}</h1>
          </div>
        )
      },
      h2: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h2 className="my-[0.83em] text-3xl md:text-4xl">{children}</h2>
          </div>
        )
      },
      h3: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h3 className="my-[1em] text-2xl md:text-3xl">{children}</h3>
          </div>
        )
      },
      h4: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h4 className="my-[1.33em] text-xl md:text-2xl">{children}</h4>
          </div>
        )
      },
      h5: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h5 className="my-[1.67em] text-lg md:text-xl">{children}</h5>
          </div>
        )
      },
      h6: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h6 className="my-[2em] text-base md:text-lg">{children}</h6>
          </div>
        )
      },
    },
    marks: {
      link: ({ children, value }) => {
        return (
          <a
            className="underline transition hover:opacity-50"
            href={value?.href}
            rel="noreferrer noopener"
          >
            {children}
          </a>
        )
      },
    },
    list: {
      bullet: ({ children }) => {
        return (
          <ul className={`${paragraphClasses} my-[1rem] list-disc pl-[40px]`}>
            {children}
          </ul>
        )
      },
      number: ({ children }) => {
        return (
          <ol
            className={`${paragraphClasses} my-[1rem] list-decimal pl-[40px]`}
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
            <ImageContainer image={value} alt={value.alt || value.caption} />
            {value?.caption && (
              <div className="font-antarctican text-sm text-gray-600">
                {value.caption}
              </div>
            )}
          </div>
        )
      },
      timeline: ({ value }) => {
        const { items } = value || {}
        return <TimelineSection timelines={items} />
      },
    },
  }

  return <PortableText components={components} value={value} />
}
