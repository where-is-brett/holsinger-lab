import { BookIcon } from '@sanity/icons/Book'
import { isValidDoi } from 'lib/doi'
import { defineField, defineType } from 'sanity'

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
  ],
})
