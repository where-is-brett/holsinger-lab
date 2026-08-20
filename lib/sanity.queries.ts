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

// Only publications that have a slug get a page. The 19 live records have none
// until the backfill runs, so this returns nothing rather than breaking -- the
// same shape as `projectPaths` and `profilePaths`.
export const publicationPaths = groq`
  *[_type == "publication" && slug.current != null].slug.current
`

export const featuredPublicationsQuery = groq`
  *[_type == "publication" && featured == true] | order(date desc) {
    ${publicationFields}
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
