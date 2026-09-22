import type { MetadataRoute } from 'next'

// Preview deploy of a candidate design: disallow everything.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
