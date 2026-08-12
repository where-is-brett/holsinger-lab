import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'
import type { Image as Image_2 } from 'sanity'

interface ImageBoxProps {
  image: Image_2 // { asset?: any }
  alt: string
  width?: number
  height?: number
  size?: string
  classesWrapper?: string
}

export default function ImageContainer({
  image,
  alt = 'Cover image',
  width = 1200,
  height = 800,
  // Callers render this component at widely different widths (a full-bleed
  // project cover vs. a one-third-width profile card). `100vw` is only correct
  // for the full-bleed case and makes every other call site download a far
  // larger candidate than it can display -- a 325px People card was selecting
  // the 3840w image. Pass the real layout.
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
  // `fit('max')`, not `fit('crop')`: unlike `ImageBox` (used for fixed-aspect cover slots whose
  // wrapper CSS already constrains the box), this component renders arbitrary body-content images
  // with no fixed-aspect wrapper — cropping to a fixed 1200x800 box would silently discard content
  // for any non-3:2 source image. `fit('max')` scales down to fit within the bounds while
  // preserving the source's own aspect ratio, matching `lib/sanity.image.ts`'s own base builder
  // default.
  const imageUrl = urlForImage(image)
    ?.width(width)
    .height(height)
    .fit('max')
    .url()

  return (
    <div
      className={`media-frame bg-surface-raised relative w-full overflow-hidden ${
        classesWrapper ?? ''
      }`}
    >
      {imageUrl && (
        <Image
          // `object-contain`, not `object-cover`: this component renders
          // arbitrary body-content images and already requests `fit('max')`
          // server-side to preserve the source aspect ratio. Contain never
          // crops, matching that intent; `cover` could silently clip a
          // figure. The browser default `fill` would stretch it.
          className="h-full w-full object-contain"
          alt={alt}
          width={width}
          height={height}
          sizes={size}
          src={imageUrl}
        />
      )}
    </div>
  )
}
