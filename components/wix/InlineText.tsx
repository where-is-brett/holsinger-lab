import { PortableText, type PortableTextBlock, type PortableTextComponents } from '@portabletext/react'
import { stegaClean } from 'next-sanity'

const components: PortableTextComponents = {
  block: { normal: ({ children }) => <p>{children}</p> },
  marks: {
    link: ({ children, value }) => (
      <a href={stegaClean(value?.href) ?? '#'} className="underline" target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
  },
}

export function InlineText({
  value,
  className,
  ...rest
}: {
  value?: PortableTextBlock[] | null
  className?: string
  'data-wix'?: string
}) {
  if (!value?.length) return null
  return (
    <div className={className} {...rest}>
      <PortableText value={value} components={components} />
    </div>
  )
}
