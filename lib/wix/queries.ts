import { groq } from 'next-sanity'

export const siteNameQuery = groq`coalesce(*[_type == "settings"][0].siteName, *[_type == "home"][0].title)`

export const homeQuery = groq`{
  "copy": *[_type == "siteCopy"][0]{
    // "heroImageLqip" is a sibling scalar, not a dereference of "image"
    // itself -- an "asset->" projection on the image field would replace its
    // reference object wholesale (stripping "_ref"), which is exactly the
    // derived-asset trap urlForImage's own comment documents. Hero.tsx still
    // reads a plain "image.asset._ref" for both the CDN URL and the
    // intrinsic-width cap.
    hero{ ..., "heroImageLqip": image.asset->metadata.lqip },
    about
  },
  "news": *[_type == "newsItem" && showOnHome != false] | order(orderRank) { _id, title, body },
  "contact": *[_type == "settings"][0].contact
}`

export const researchQuery = groq`*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) {
  _id, title, description, coverImage
}`

export const newsQuery = groq`*[_type == "newsItem" && showOnNewsPage != false] | order(orderRank) { _id, title, summary }`

// defined(title): a brand-new draft document (created via "+ New" in Studio,
// before the editor has typed a title) has no `title` field at all -- Sanity
// never invents a default for a required string. Without this filter, that
// row survives to PublicationEntry with `pub.title` undefined, and
// `pub.title.trim()` throws (I4).
export const publicationsQuery = groq`*[_type == "publication" && defined(title)] | order(date desc) {
  _id, title, author, journal, volume, issue, pages, date, doi, url, "slug": slug.current
}`

export const teamQuery = groq`{
  "intro": *[_type == "siteCopy"][0].teamIntro,
  "alumniSubtitle": *[_type == "siteCopy"][0].alumniSubtitle,
  "labHeadId": *[_type == "settings"][0].labHead._ref,
  "profiles": *[_type == "profile"] | order(orderRank) { _id, name, role, roleDetail, image, "group": roleGroup->title }
}`

export const mediaQuery = groq`*[_type == "mediaAppearance"] | order(orderRank) {
  _id, title, outlet, date, url, "videoUrl": video.asset->url, poster
}`

export const contactQuery = groq`{
  "intro": *[_type == "siteCopy"][0].contactIntro,
  "contact": *[_type == "settings"][0].contact
}`
