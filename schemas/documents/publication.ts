import { BookIcon } from '@sanity/icons/Book'
import { isValidDoi } from 'lib/doi'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { publicationSlug } from 'schemas/lib/publicationSlug'
import { validateSlugFormat } from 'schemas/lib/slug'
import { TOPIC_OPTIONS } from 'schemas/lib/topics'

// The three publication types from the agreed IA section 2. Stored as the
// displayed string, matching `topics` -- see schemas/lib/topics.ts for why.
export const PUBLICATION_TYPES = ['Article', 'Review', 'Case report'] as const

export default defineType({
  type: 'document',
  name: 'publication',
  title: 'Publication',
  icon: BookIcon,
  orderings: [
    {
      title: 'Date Published',
      name: 'publicationDateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  fields: [
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description:
        'Format: "Family Initials." per author, separated by commas -- e.g. "Holsinger R.M.D., Smith J.A." The "Fetch from DOI" action (see the DOI field below) writes this format automatically from Crossref\'s structured author data; existing records were entered by hand and are not all consistent.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Enter the full title of the Article',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in this publication\'s page URL: /publications/<slug>. Generated from the title and the publication year -- press "Generate" after filling in Title and Date. Existing records have no slug until the backfill script is run (npm run backfill:publication-slugs); a publication without one is still listed, it just has no page of its own.',
      options: {
        source: (doc) => publicationSlug(doc.title, doc.date),
        maxLength: 96,
        // `source` already returns the finished slug, year included; slugify
        // would otherwise re-cap it at 96 and cut the year back off.
        slugify: (value: string) => value,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      // Deliberately not `required()`: the 19 live records have no slug yet and
      // this work does not write to the live dataset, so requiring it would mark
      // every existing publication invalid in Studio. Phase 3 tightens this once
      // the backfill has run.
      validation: (rule) => rule.custom(validateSlugFormat),
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'number',
      description: 'Enter the Volume',
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Volume number must be a positive integer'
          }
          return true
        }),
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'number',
      description: 'Enter Issue Number',
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Issue number must be a positive integer'
          }
          return true
        }),
    }),
    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'string',
      description: 'Enter pages of the chapter you wish to refer to.',
    }),
    defineField({
      name: 'journal',
      title: 'Journal',
      type: 'string',
      description: 'Enter the full title of the Journal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
      description:
        'Bare DOI only, e.g. "10.1038/s41420-025-02362-7" -- no "https://doi.org/" prefix. Powers the "Fetch from DOI" action in the document menu, which autofills Title, Author, Journal, Volume, Issue, Pages, Date, and Abstract from Crossref. Leave blank if this publication has no DOI.',
      validation: (Rule) =>
        Rule.custom((value: string | undefined) => {
          if (value === undefined || value === '') return true
          return isValidDoi(value) || 'Must be a bare DOI, e.g. 10.1038/s41420-025-02362-7 (no URL prefix)'
        }),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      description:
        "The publisher's article page (e.g. the journal's own URL for this article). If this publication has a DOI, enter it in the DOI field above instead -- this field no longer doubles as the DOI source.",
      type: 'url',
    }),
    defineField({
      name: 'abstract',
      title: 'Abstract',
      type: 'text',
      description: 'Brief summary or abstract of the bibliography entry.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      // initialValue: () => new Date().toLocaleString('en-US', {
      //   year: 'numeric',
      //   month: '2-digit',
      //   day: '2-digit',
      // }),
      options: {
        dateFormat: 'YYYY-MM-DD', // Adjust the date format according to your needs
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      description:
        'What kind of publication this is. Drives the "type" facet on the Publications page alongside year and topic.',
      options: {
        list: PUBLICATION_TYPES.map((value) => ({ title: value, value })),
        layout: 'radio',
      },
      // Not required, for the same reason as `slug`: the 19 live records predate
      // this field. An untyped paper still lists, it just sits outside the type
      // facet.
    }),
    defineField({
      name: 'topics',
      title: 'Topics',
      type: 'array',
      description:
        'Topic tags for the Publications page facets. Every paper should carry at least one; an untagged paper is still listed and still appears under the year and type facets -- the record never hides anything.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: TOPIC_OPTIONS },
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description:
        'Surfaces this publication in the highlights block on the home page. Replaces the old hand-maintained "Publication highlights" entry.',
    }),
  ],
})
