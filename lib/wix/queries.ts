import { groq } from 'next-sanity'

export const siteNameQuery = groq`coalesce(*[_type == "settings"][0].siteName, *[_type == "home"][0].title)`
