import { CustomPortableText } from 'components/shared/CustomPortableText'

interface HeaderProps {
  centered?: boolean
  description?: any[]
  title?: string
}
export function Header(props: HeaderProps) {
  const { title, description, centered = false } = props
  if (!description && !title) {
    return null
  }
  return (
    <div
      className={`${
        centered ? 'px-4 text-center md:px-0 md:text-start' : 'w-5/6 lg:w-3/5'
      }`}
    >
      {/* Title */}
      {title && (
        <div className="mb-6 text-3xl font-extrabold tracking-tight md:text-5xl">
          {title}
        </div>
      )}
      {/* Description */}
      {description && (
        <div className="mb-6 mt-4 font-ariana text-xl text-gray-900 md:text-2xl">
          <CustomPortableText value={description} />
        </div>
      )}
    </div>
  )
}
