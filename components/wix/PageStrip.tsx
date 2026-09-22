export function PageStrip({
  heading,
  headingClass = 'text-[26px]/[35px] md:text-[35px]/[47.25px]',
  topClass = 'pt-[62px] md:pt-[122px]',
  children,
}: {
  heading: string
  headingClass?: string
  topClass?: string
  children?: React.ReactNode
}) {
  return (
    <section data-wix="strip" className="bg-strip pb-[80px]">
      <div className={`wix-col ${topClass}`}>
        <h1 className={`font-playfair ${headingClass}`}>{heading}</h1>
        {children}
      </div>
    </section>
  )
}
