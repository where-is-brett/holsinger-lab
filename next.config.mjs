/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.sanity.io' },
      { hostname: 'source.unsplash.com' },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      // The Wix site's own paths for Team and Contact.
      { source: '/blank-5', destination: '/team', permanent: true },
      { source: '/blank-4', destination: '/contact', permanent: true },
      // The previous (pre-Wix) redesign's paths (M5). Wix never had these,
      // but the old site did, and links to them exist in the wild -- keep
      // them resolving instead of 404ing.
      { source: '/people', destination: '/team', permanent: true },
      { source: '/people/:slug', destination: '/team', permanent: true },
      { source: '/projects/:slug', destination: '/research', permanent: true },
    ]
  },
}

export default config
