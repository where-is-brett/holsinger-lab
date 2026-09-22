import { permanentRedirects } from './lib/redirects.mjs'

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
    return permanentRedirects.map((redirect) => ({
      ...redirect,
      permanent: true,
    }))
  },
}

export default config
