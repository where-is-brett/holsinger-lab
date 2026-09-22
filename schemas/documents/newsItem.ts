import { DocumentIcon } from '@sanity/icons/Document'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'
import { inlineBlock } from 'schemas/lib/inlineBlock'

// A news item appears in up to two places, with different text in each --
// on the Wix site the Home "News & Highlights" block shows a headline plus
// body, while the News page shows a single sentence. Order is curated by
// drag-and-drop (orderRank), because Wix shows no dates and the import must
// not invent them.
export default defineType({
  type: 'document',
  name: 'newsItem',
  title: 'News',
  icon: DocumentIcon,
  orderings: [orderRankOrdering],
  preview: { select: { title: 'title', subtitle: 'summary' } },
  fields: [
    orderRankField({ type: 'newsItem' }),
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      description: 'Shown in bold on the Home page, e.g. "Honours Thesis Submitted".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Home page text',
      type: 'array',
      description: 'The text under the headline on the Home page.',
      of: [inlineBlock],
    }),
    defineField({
      name: 'summary',
      title: 'News page sentence',
      type: 'string',
      description:
        'The one-line version shown on the News page. Leave empty to show the headline instead.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'For your records. Not shown on the site; drag items in the list to reorder them.',
    }),
    defineField({
      name: 'showOnHome',
      title: 'Show on the Home page',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'showOnNewsPage',
      title: 'Show on the News page',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
