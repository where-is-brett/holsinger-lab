import type { PortableTextBlock } from '@portabletext/types'
import { CustomPortableText } from 'components/shared/CustomPortableText'


export function Footer({ footer }: { footer?: PortableTextBlock[] }) {
  return (
    <footer className="border-t border-primary font-antarctican bottom-0 w-full bg-background py-5 text-center lg:py-6">
      {footer && (
        <CustomPortableText
          paragraphClasses="text-md md:text-xl"
          value={footer}
        />
      )}
    </footer>
  )
}
