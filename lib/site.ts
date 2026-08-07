export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://holsingerlab.vercel.app'
).replace(/\/$/, '')
