import type { PortableTextBlock } from '@portabletext/react'
import type { Image } from 'sanity'

export type AltImage = Image & { alt?: string | null }

export interface ContactDetails { address?: string | null; email?: string | null; phone?: string | null }

export interface HomeData {
  copy: {
    hero?: { image?: AltImage | null; heading?: string | null; subheading?: string | null } | null
    about?: {
      heading?: string | null
      body?: PortableTextBlock[] | null
      themesIntro?: string | null
      themes?: { _key: string; title?: string | null; summary?: string | null }[] | null
    } | null
  } | null
  news: { _id: string; title: string; body?: PortableTextBlock[] | null }[]
  contact: ContactDetails | null
}

export interface ResearchProject { _id: string; title: string; description?: PortableTextBlock[] | null; coverImage?: AltImage | null }

export interface NewsLine { _id: string; title: string; summary?: string | null }

export interface CitationSource {
  journal?: string | null; date?: string | null; volume?: number | null; issue?: number | null; pages?: string | null
}
export interface PublicationEntry extends CitationSource { _id: string; title: string; author?: string | null; doi?: string | null; url?: string | null }

export interface TeamProfile {
  _id: string; name: string; role?: string | null; roleDetail?: string | null; group: string | null; image?: AltImage | null
}
export interface TeamData { intro: string | null; alumniSubtitle: string | null; labHeadId: string | null; profiles: TeamProfile[] }

export interface MediaItem {
  _id: string; title: string; outlet: string; date?: string | null; url?: string | null; videoUrl?: string | null; poster?: AltImage | null
}

export interface ContactData { intro: string | null; contact: ContactDetails | null }
