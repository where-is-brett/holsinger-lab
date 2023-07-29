import { PortableText, PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import ImageBox from 'components/shared/ImageBox'
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
          <blockquote className={`text-2xl font-serif text-left text-gray-600 my-[1em] quotes`}>
            <span className="text-4xl pr-2">“</span>
            {children}
            <span className="text-4xl pl-2">”</span>
          </blockquote>
        );
      },
      h1: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h1 className="text-4xl md:text-5xl my-[0.67em]">{children}</h1>
          </div>
        )
      },
      h2: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h2 className="text-3xl md:text-4xl my-[0.83em]">{children}</h2>
          </div>
        )
      },
      h3: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h3 className="text-2xl md:text-3xl my-[1em]">{children}</h3>
          </div>
        )
      },
      h4: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h4 className="text-xl md:text-2xl my-[1.33em]">{children}</h4>
          </div>
        )
      },
      h5: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h5 className="text-lg md:text-xl my-[1.67em]">{children}</h5>
          </div>
        )
      },
      h6: ({ children }) => {
        return (
          <div className={`${paragraphClasses}`}>
            <h6 className="text-base md:text-lg my-[2em]">{children}</h6>
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
      bullet: ({children}) => {
        return <span className={`${paragraphClasses} list-disc`}>{children}</span>
      },
      number: ({children}) => {
        return <span className={`${paragraphClasses} list-decimal`}>{children}</span>
      }
    },
    types: {
      image: ({
        value,
      }: {
        value: Image & { alt?: string; caption?: string }
      }) => {
        return (
          <div className="my-6 space-y-2">
            <ImageBox
              image={value}
              alt={value.alt || value.caption}
              classesWrapper="relative aspect-[16/9]"
            />
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
