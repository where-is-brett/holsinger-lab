import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types'
import { CustomPortableText } from 'components/shared/CustomPortableText'
import ImageBox from 'components/shared/ImageBox'

import { ContactLinks } from './ContactLinks'

export interface PersonBioPerson {
  // Matches `ImageBox`'s own declared prop type exactly (`{ asset?: any } | null`),
  // not the stricter `Image` from 'sanity' -- this component only ever forwards
  // `image` straight through to `ImageBox`, and every generated payload's `image`
  // field (leaving crop/hotspot optional) is already assignable to that looser
  // shape without a cast. Typing this `Image` would force every call site (Tasks
  // 6 and 7) to cast, for no benefit.
  image?: { asset?: any } | null
  name?: string | null
  role?: string | null
  email?: string | null
  phone?: string | null
  fullBio?: (PortableTextBlock | ArbitraryTypedObject)[] | null
  bio?: string | null
}

export function PersonBio({
  person,
  layout,
}: {
  person: PersonBioPerson
  layout: 'spotlight' | 'page'
}) {
  const { image, name, role, email, phone, fullBio, bio } = person

  return (
    <div
      className={
        layout === 'spotlight'
          ? 'flex flex-col gap-6 md:flex-row md:items-start'
          : 'flex flex-col gap-6'
      }
    >
      <div
        className={
          layout === 'spotlight' ? 'w-full md:w-5/12 lg:w-4/12' : 'w-full md:w-1/3'
        }
      >
        <ImageBox
          image={image}
          width={800}
          height={800}
          size={
            layout === 'spotlight'
              ? '(min-width: 768px) 40vw, 100vw'
              : '(min-width: 768px) 33vw, 100vw'
          }
          alt={name ? `Profile image of ${name}` : 'Profile image'}
          classesWrapper="relative aspect-[1/1] rounded border border-rule"
        />
      </div>
      <div className="flex-1 space-y-4">
        <div>
          {name &&
            (layout === 'page' ? (
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
                {name}
              </h1>
            ) : (
              <h2 className="text-2xl font-bold md:text-3xl">{name}</h2>
            ))}
          {role && <p className="text-text-muted">{role}</p>}
        </div>
        <ContactLinks email={email} phone={phone} />
        <div className="font-ariana text-text-muted">
          {fullBio && fullBio.length > 0 ? (
            <CustomPortableText value={fullBio} />
          ) : (
            bio && <p>{bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}
