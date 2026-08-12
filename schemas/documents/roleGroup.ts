import { TagIcon } from '@sanity/icons/Tag'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'roleGroup',
  title: 'Role Groups',
  icon: TagIcon,
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({
      type: 'roleGroup',
    }),

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Shown as a section heading on the public People page, e.g. "PhD Student". Reorder the list from the "Role Groups" entry in the Studio sidebar.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
