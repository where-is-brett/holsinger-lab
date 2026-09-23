import { groq } from 'next-sanity'

export const homePageQuery = groq`
  *[_type == "home"][0]{
    _id,
    overview,
    showcaseProjects[]->{
      _type,
      coverImage,
      overview,
      "slug": slug.current,
      tags,
      title,
    },
    title,
  }
`

export const homePageTitleQuery = groq`
  *[_type == "home"][0].title
`

export const pagesBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    body[]{
      ...,
      _type == "block" => {
        markDefs[]{
          ...,
          _type == "internalLink" => {
            "slug": reference->slug.current,
            "title": reference->title,
          }
        }
      }
    },
    overview,
    title,
    "slug": slug.current,
  }
`

export const projectBySlugQuery = groq`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    "slug": slug.current,
    status,
    tags,
    title,
  }
`

export const projectPaths = groq`
  *[_type == "project" && slug.current != null].slug.current
`

export const pagePaths = groq`
  *[_type == "page" && slug.current != null].slug.current
`

export const settingsQuery = groq`
  *[_type == "settings"][0]{
    siteName,
    shortName,
    footer,
    showPublications,
    showPeople,
    showContactForm,
    showLabHeadOnHome,
    showLabHeadOnPeople,
    contact{ email },
    menuItems[]->{
      _type,
      "slug": slug.current,
      title
    },
    ogImage,
    brandColor{hex},
    theme,
    logo{
      ...,
      asset->{
        ...,
        metadata { dimensions { aspectRatio } }
      }
    },
    logoDark{
      ...,
      asset->{
        ...,
        metadata { dimensions { aspectRatio } }
      }
    },
    icon,
    labHead->{
      _id,
      image,
      name,
      role,
      roleDetail,
      email,
      phone,
      bio,
      "slug": slug.current,
      hasPage,
      fullBio,
    },
  }
`

// The projection shared by every publication query, so the list, the single
// page and the home-page highlights cannot drift apart.
//
// `resources` is read back from `resource.publication` rather than stored on
// the publication: the link lives in exactly one place (see
// schemas/documents/resource.ts), and this is the reverse half of it.
const publicationFields = `
  _id,
  title,
  author,
  journal,
  volume,
  issue,
  pages,
  abstract,
  url,
  doi,
  date,
  "slug": slug.current,
  type,
  topics,
  featured,
  "resources": *[_type == "resource" && references(^._id)] | order(title asc) {
    _id,
    title,
    kind,
  },
`

export const publicationsQuery = groq`
  *[_type == "publication"] | order(date desc) {
    ${publicationFields}
  }
`

export const publicationBySlugQuery = groq`
  *[_type == "publication" && slug.current == $slug][0]{
    ${publicationFields}
  }
`

// Only publications that have a slug get a page. All 19 live records were
// backfilled with a unique slug on 2026-09-22, and `slug` is now required in
// the schema, but a draft can still lack one, so this guard stays -- the same
// shape as `projectPaths` and `profilePaths`.
export const publicationPaths = groq`
  *[_type == "publication" && slug.current != null].slug.current
`

export const featuredPublicationsQuery = groq`
  *[_type == "publication" && featured == true] | order(date desc) {
    ${publicationFields}
  }
`

// Home's "Recent work" block (Task 3 brief / spec §6): the latest 5
// publications by date, sharing `publicationFields` with every other
// publication query so the three can never drift apart.
export const homeRecentPublicationsQuery = groq`
  *[_type == "publication"] | order(date desc)[0...5] {
    ${publicationFields}
  }
`

// The "All {count} publications →" link's count -- a separate `count()`
// query rather than fetching every publication and taking `.length`, since
// Home only ever needs the 5 most recent records, not the full list.
export const publicationCountQuery = groq`
  count(*[_type == "publication"])
`

// The projection shared by every resource query, so the list and the
// home-page highlight cannot drift apart -- same pattern as
// `publicationFields` above.
const resourceFields = `
  _id,
  title,
  kind,
  summary,
  howToObtain,
  publication->{
    _id,
    title,
    date,
    doi,
    url,
    journal,
    volume,
    issue,
    pages,
    "slug": slug.current,
  },
`

// Home's "Resources" block (Task 3 brief / spec §6): the first resource, in
// the same order as `resourcesQuery` (title asc) -- one document, not the
// full list.
export const homeResourceQuery = groq`
  *[_type == "resource"] | order(title asc) [0] {
    ${resourceFields}
  }
`

// Home's "Outreach" band (Task 3 brief / spec §2 ruling 4): the `maestro`
// project document, by its fixed slug. The block is omitted entirely when
// this document doesn't exist (spec ruling 4) -- `home` itself carries no
// editorial fields for it.
export const maestroProjectQuery = groq`
  *[_type == "project" && slug.current == "maestro"][0]{
    _id,
    title,
    overview,
    site,
  }
`

// Home's "Support our research" link (Task 3 brief / spec §6, "The lab"):
// resolved by the fixed `support-our-research` slug, same "only render when
// the document exists" pattern as `maestroProjectQuery` above.
export const supportPageQuery = groq`
  *[_type == "page" && slug.current == "support-our-research"][0]{
    title,
    "slug": slug.current,
  }
`

// Home's hero statement and its research-themes fallback (revision spec,
// PR 2). The shared `siteCopy` singleton is empty in production today, so
// every field is optional and the caller falls back.
export const homeSiteCopyQuery = groq`
  *[_type == "siteCopy"][0]{
    hero{ subheading },
    about{ body, themes[]{ title, summary } },
  }
`

// Spec §2 / §6, Task 2 brief: the Research page lists projects that carry a
// `researchOrder`, in that order. Production has zero such projects today
// (a coming Wix import sets it on four); the screen's populated state is
// exercised against the `gallery-research` fixture until then, same
// situation as Task 1's `resourcesQuery`.
export const researchProjectsQuery = groq`
  *[_type == "project" && defined(researchOrder)] | order(researchOrder asc) {
    _id,
    title,
    "slug": slug.current,
    overview,
    description,
    coverImage{
      ...,
      asset->{
        _id,
        metadata{ dimensions{ width, height, aspectRatio } }
      }
    },
    "start": duration.start,
    tags,
    category,
  }
`

export const resourcesQuery = groq`
  *[_type == "resource"] | order(title asc) {
    ${resourceFields}
  }
`

export const roleGroupQuery = groq`
  *[_type == "roleGroup"] | order(orderRank) {
    _id,
    title,
  }
`

export const profileQuery = groq`
  *[_type == "profile"] | order(orderRank) {
    _id,
    image,
    orderRank,
    name,
    role,
    roleDetail,
    roleGroup->{
      _id,
      title,
    },
    email,
    phone,
    bio,
    "slug": slug.current,
    hasPage,
    fullBio,
  }
`

export const profileBySlugQuery = groq`
  *[_type == "profile" && slug.current == $slug && hasPage == true][0]{
    _id,
    image,
    name,
    role,
    roleDetail,
    email,
    phone,
    bio,
    "slug": slug.current,
    hasPage,
    fullBio,
  }
`

export const profilePaths = groq`
  *[_type == "profile" && hasPage == true && slug.current != null].slug.current
`
