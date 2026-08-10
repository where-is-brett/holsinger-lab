import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { defineLive } from 'next-sanity/live'

export const { sanityFetch, SanityLive } = defineLive({
  client: getClient(),
  serverToken: readToken || false,
  browserToken: false,
})
