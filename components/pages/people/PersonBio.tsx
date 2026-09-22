import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types'
import { CustomPortableText } from 'components/shared/CustomPortableText'
import ImageBox from 'components/shared/ImageBox'

// ContactLinks.tsx was deleted in Phase 3 PR B (People) -- People.tsx,
// Profile.tsx and Spotlight.tsx (its only other callers) were rebuilt on the
// redesign primitives and no longer need it, but PersonBio.tsx (this file)
// is carried forward unstyled until Task 3 replaces it, so its two mailto:/
// tel: links are inlined here rather than left importing a file that no
// longer exists.
function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1L6.6 10.8Z" />
    </svg>
  )
}

function ContactLinks({ email, phone }: { email?: string | null; phone?: string | null }) {
  if (!email && !phone) {
    return null
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      {email && (
        <div className="inline-flex space-x-1">
          <MailIcon />
          <a href={`mailto:${email}`} className="hover:text-link">
            {email}
          </a>
        </div>
      )}
      {phone && (
        <div className="inline-flex space-x-1">
          <PhoneIcon />
          <a href={`tel:${phone}`} className="hover:text-link">
            {phone}
          </a>
        </div>
      )}
    </div>
  )
}

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
