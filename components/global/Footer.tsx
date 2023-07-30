import type { PortableTextBlock } from '@portabletext/types'
import { CustomPortableText } from 'components/shared/CustomPortableText'

export function Footer({ footer }: { footer?: PortableTextBlock[] }) {
  return (
    <footer className="bottom-0 w-full border-t border-primary bg-background py-5 text-center font-antarctican lg:py-6">
      {footer && (
        <CustomPortableText
          paragraphClasses="text-md md:text-xl"
          value={footer}
        />
      )}
    </footer>
  )
}
