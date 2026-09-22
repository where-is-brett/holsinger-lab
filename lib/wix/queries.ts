import { groq } from 'next-sanity'

export const siteNameQuery = groq`coalesce(*[_type == "settings"][0].siteName, *[_type == "home"][0].title)`

export const homeQuery = groq`{
  "copy": *[_type == "siteCopy"][0]{ hero, about },
  "news": *[_type == "newsItem" && showOnHome != false] | order(orderRank) { _id, title, body },
  "contact": *[_type == "settings"][0].contact
}`

export const researchQuery = groq`*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) {
  _id, title, description, coverImage
}`

export const newsQuery = groq`*[_type == "newsItem" && showOnNewsPage != false] | order(orderRank) { _id, title, summary }`

export const publicationsQuery = groq`*[_type == "publication"] | order(date desc) {
  _id, title, author, journal, volume, issue, pages, date, doi, url
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
