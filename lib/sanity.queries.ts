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

export const publicationsQuery = groq`
  *[_type == "publication"] | order(date desc) {
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
