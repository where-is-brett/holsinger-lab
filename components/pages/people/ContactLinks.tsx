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

export function ContactLinks({
  email,
  phone,
}: {
  email?: string | null
  phone?: string | null
}) {
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
