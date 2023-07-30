import { defineField, defineType } from 'sanity'
import { BookIcon } from '@sanity/icons'

export default defineType({
  type: 'document',
  name: 'publication',
  title: 'Publication',
  icon: BookIcon,
  orderings: [
    {
      title: 'Date Published',
      name: 'publicationDateDesc',
      by: [
        { field: 'date', direction: 'desc' },
      ],
    }
  ],
  fields: [
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
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
      validation: (Rule) => Rule.custom((num: number) => {
        if (num <= 0) {
          return 'Volume number must be a positive integer'
        }
        return true
      })
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'number',
      description: 'Enter Issue Number',
      validation: (Rule) => Rule.custom((num: number) => {
        if (num <= 0) {
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
      name: 'url',
      title: 'URL',
      description: 'Enter the full DOI / URL of the journal',
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
});
