import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'

interface ImageBoxProps {
  image?: { asset?: any }
  alt?: string
  width?: number
  height?: number
  size?: string
  classesWrapper?: string
}

export default function ImageContainer({
  image,
  alt = 'Cover image',
  width = 0,
  height = 0,
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
  const imageUrl = urlForImage(image)?.url()

  return (
    <div
      className={`w-full overflow-hidden bg-gray-50 ${classesWrapper}`}
    >
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
