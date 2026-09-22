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
    // The Wix site's own paths for Team and Contact.
    return [
      { source: '/blank-5', destination: '/team', permanent: true },
      { source: '/blank-4', destination: '/contact', permanent: true },
    ]
  },
}

export default config
