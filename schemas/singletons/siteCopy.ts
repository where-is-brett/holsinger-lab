import { EditIcon } from '@sanity/icons/Edit'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { inlineBlock } from 'schemas/lib/inlineBlock'

// Editorial copy used by the Wix-style layout (redesign/wix). Kept off `home`
// deliberately: the Modern Instrument redesign's Home has no editorial fields
// (agreed-ia.md section 2), and putting Wix-only copy there would make it look
// as if the redesign ignored content it was meant to show.
export default defineType({
  name: 'siteCopy',
  title: 'Site copy',
  type: 'document',
  icon: EditIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Home page banner',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', title: 'Description', type: 'string' })],
        }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'subheading', title: 'Subheading', type: 'string' }),
      ],
    }),
    defineField({
      name: 'about',
      title: 'About the laboratory',
      type: 'object',
      fields: [
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'body', title: 'Text', type: 'array', of: [inlineBlock] }),
        defineField({
          name: 'themesIntro',
          title: 'Research themes introduction',
          type: 'string',
        }),
        defineField({
          name: 'themes',
          title: 'Research themes',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'theme',
              fields: [
                defineField({ name: 'title', title: 'Theme', type: 'string' }),
                defineField({ name: 'summary', title: 'One-line summary', type: 'string' }),
              ],
              preview: { select: { title: 'title', subtitle: 'summary' } },
            }),
          ],
        }),
      ],
    }),
    defineField({ name: 'teamIntro', title: 'Team page introduction', type: 'text', rows: 3 }),
    defineField({
      name: 'alumniSubtitle',
      title: 'Lab alumni subtitle',
      type: 'string',
      description: 'Shown under "Lab Alumni", e.g. "2020 - present".',
    }),
    defineField({
      name: 'contactIntro',
      title: 'Contact page introduction',
      type: 'string',
      description: 'The line above "CONTACT US" on the Contact page.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site copy' }) },
})
