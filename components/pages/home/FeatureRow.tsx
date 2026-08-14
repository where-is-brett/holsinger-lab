import ImageBox from 'components/shared/ImageBox'
import type { ReactNode } from 'react'

export interface FeatureRowProps {
  // Matches `ImageBox`'s own declared prop type (`{ asset?: any } | null`), not
  // the stricter `Image` from 'sanity' -- this component only forwards `image`
  // straight through to `ImageBox`, exactly like the original `ProjectListItem`
  // did (no cast). Typing this `Image` would force every call site (this task's
  // `ProjectListItem` and Task 9's `HomePage`) to cast, for no benefit.
  image?: { asset?: any } | null
  alt: string
  side: 'left' | 'right'
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function FeatureRow({
  image,
  alt,
  side,
  title,
  children,
  footer,
}: FeatureRowProps) {
  const odd = side === 'right'
  return (
    <div
      className={`flex flex-col transition hover:bg-surface-raised/0 md:flex-row ${
        odd && 'border-y md:flex-row-reverse'
      }`}
    >
      <div
        className={`w-full md:w-7/12 lg:w-8/12 ${
          odd ? 'md:border-l' : 'md:border-r'
        }`}
      >
        <ImageBox
          image={image}
          alt={alt}
          // Measured, not the naive Tailwind fraction: `md:w-7/12`/`lg:w-8/12`
          // apply against the content box inside Layout's
          // `md:px-gutter-md lg:px-gutter-lg` side padding, so as a fraction
          // of the full viewport the card is smaller than 58%/67%. Measured
          // across 900-1536px viewports: ~49vw in the md range, ~49-55vw in
          // the lg range. 50vw/58vw cover the measured range with a small
          // safety margin.
          size="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
          // Both `aspect-[16/9]` and `h-full` are load-bearing, at
          // different breakpoints. Below `md:` the card is `flex-col`, the
          // column has no definite height, and `aspect-[16/9]` gives the
          // box its shape. At `md:`+ the card is `flex-row`, the row
          // stretches this column to the *text* column's height, `h-full`
          // makes that height definite, and a box with definite width and
          // height ignores `aspect-ratio` entirely -- so the card stays
          // visually filled. That is intended; `ImageBox`'s `object-cover`
          // is what keeps the bitmap undistorted in the `md:`+ case.
          classesWrapper="aspect-[16/9] h-full"
        />
      </div>
      <div
        className={`flex border-t md:w-5/12 md:border-t-0 md:px-3 lg:w-4/12`}
      >
        <div className="relative mt-2 flex w-full flex-col justify-between p-3">
          <div>
            <h3 className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
              {title}
            </h3>
            <div className="font-ariana text-text-muted">{children}</div>
          </div>
          {footer}
        </div>
      </div>
    </div>
  )
}
