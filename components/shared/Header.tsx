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
    <div className={`${centered ? 'text-center md:text-start px-4 md:px-0' : 'w-5/6 lg:w-3/5'}`}>
      {/* Title */}
      {title && (
        <div className="text-3xl font-extrabold tracking-tight md:text-5xl mb-6">
          {title}
        </div>
      )}
      {/* Description */}
      {description && (
        <div className="mt-4 mb-6 font-ariana text-xl text-gray-900 md:text-2xl">
          <CustomPortableText value={description} />
        </div>
      )}
    </div>
  )
}
