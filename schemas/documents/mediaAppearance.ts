import { PlayIcon } from '@sanity/icons/Play'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'mediaAppearance',
  title: 'Media',
  icon: PlayIcon,
  orderings: [orderRankOrdering],
  preview: { select: { title: 'title', subtitle: 'outlet' } },
  fields: [
    orderRankField({ type: 'mediaAppearance' }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The headline of the article or segment.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'outlet',
      title: 'Outlet',
      type: 'string',
      description: 'Who published it, e.g. "ABC News". Shown in italics.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'date', title: 'Date', type: 'date' }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'The article online. Leave empty if you upload the video below instead.',
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: { accept: 'video/mp4' },
      description: 'An mp4 to play on the page. Optional.',
    }),
    defineField({
      name: 'poster',
      title: 'Video still',
      type: 'image',
      description: 'The picture shown before the video plays.',
      options: { hotspot: true },
    }),
  ],
})
