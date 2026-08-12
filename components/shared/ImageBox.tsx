import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'

interface ImageBoxProps {
  image?: { asset?: any } | null
  alt?: string
  width?: number
  height?: number
  size?: string
  classesWrapper?: string
}

export default function ImageBox({
  image,
  alt = 'Cover image',
  width = 3500,
  height = 2000,
  // Callers render this component at widely different widths (a full-bleed
  // project cover vs. a one-third-width profile card). `100vw` is only correct
  // for the full-bleed case and makes every other call site download a far
  // larger candidate than it can display -- a 325px People card was selecting
  // the 3840w image. Pass the real layout.
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
  const imageUrl =
    image && urlForImage(image)?.height(height).width(width).fit('crop').url()

  return (
    <div
      className={`media-frame bg-surface-raised relative w-full overflow-hidden ${
        classesWrapper ?? ''
      }`}
    >
      {imageUrl && (
        <Image
          // `object-cover`, not the browser default `fill`: this component
          // fills fixed-aspect cover slots whose box is not guaranteed to
          // match the server-side crop. `fill` stretches the bitmap; at
          // `md:`+ the home cards' box was measured as far off as AR 1.165
          // against a 1.750 crop -- a 1.5x vertical stretch. `cover` crops
          // the overflow instead of distorting it.
          className="absolute h-full w-full object-cover"
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
