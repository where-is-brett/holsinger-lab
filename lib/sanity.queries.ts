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
