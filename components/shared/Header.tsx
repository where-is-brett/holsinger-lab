import { CustomPortableText } from 'components/shared/CustomPortableText'

interface HeaderProps {
  centered?: boolean
  description?: any[] | null
  title?: string | null
}
export function Header(props: HeaderProps) {
  const { title, description, centered = false } = props
  if (!description && !title) {
    return null
  }
  return (
    <div
      // `px-4 ... md:px-0` looks like the per-component gutter-compensation
      // pattern Task 6 removed elsewhere (Layout now owns gutters via
      // `md:px-gutter-md lg:px-gutter-lg`), but it's intentional here, not an
      // instance of that bug: HomePage renders Layout with
      // `childrenStyles="px-0"`, opting out of Layout's own gutter entirely,
      // so this component is the only thing supplying the mobile-width
      // padding on that page. Removing it would remove HomePage's mobile
      // gutter, not just deduplicate it.
      className={`${
        centered ? 'px-4 text-center md:px-0 md:text-start' : 'w-5/6 lg:w-3/5'
      }`}
    >
      {/* Title */}
      {title && (
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight md:text-5xl">
          {title}
        </h1>
      )}
      {/* Description */}
      {description && (
        <div className="mb-6 mt-4 font-ariana text-xl text-text md:text-2xl">
          <CustomPortableText value={description} />
        </div>
      )}
    </div>
  )
}
