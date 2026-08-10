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
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
  // `fit('max')`, not `fit('crop')`: unlike `ImageBox` (used for fixed-aspect cover slots whose
  // wrapper CSS already constrains the box), this component renders arbitrary body-content images
  // with no fixed-aspect wrapper — cropping to a fixed 1200x800 box would silently discard content
  // for any non-3:2 source image. `fit('max')` scales down to fit within the bounds while
  // preserving the source's own aspect ratio, matching `lib/sanity.image.ts`'s own base builder
  // default.
  const imageUrl = urlForImage(image)?.width(width).height(height).fit('max').url()

  return (
    <div className={`w-full overflow-hidden bg-surface-raised ${classesWrapper}`}>
      {imageUrl && (
        <Image
          className="h-full w-full"
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
