export function PageStrip({
  heading,
  headingClass = 'text-[26px]/[35px] md:text-[35px]/[47.25px]',
  topClass = 'pt-[62px] md:pt-[122px]',
  headingRight,
  children,
}: {
  heading: string
  headingClass?: string
  topClass?: string
  // Rendered inline alongside the heading (e.g. the publications page's
  // "Download all" links) rather than below it, so it adds no vertical
  // space above `children` -- the Wix geometry targets pin the first
  // child's position directly off the heading.
  headingRight?: React.ReactNode
  children?: React.ReactNode
}) {
  const headingEl = <h1 className={`font-playfair ${headingClass}`}>{heading}</h1>
  return (
    <section data-wix="strip" className="bg-strip pb-[80px]">
      <div className={`wix-col ${topClass}`}>
        {headingRight ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-[24px]">
            {headingEl}
            {headingRight}
          </div>
        ) : (
          headingEl
        )}
        {children}
      </div>
    </section>
  )
}
