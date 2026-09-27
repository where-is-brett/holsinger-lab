import { defineArrayMember, defineField } from 'sanity'

// The Home page's picture banner (Modern Instrument redesign). Lives on the
// `home` singleton, not on `siteCopy`: `siteCopy.hero.image` belongs to the
// classic (Wix-style) layout, which must keep showing that whole image, so
// the redesign's per-slide crops can't be stored on it. That image is still
// used here as a fallback -- see `resolveHomeHero` (heroModel.ts).
//
// Help text is written for the lab's own editor, not a developer.

export const HERO_MAX_SLIDES = 6

const heroImageSlide = defineArrayMember({
  name: 'heroImageSlide',
  title: 'Picture',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Picture',
      type: 'image',
      description:
        'Use "Crop" to keep just the part you want (for example one panel of a figure), and "Hotspot" to mark the part that must never be cut off on a phone.',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Description for screen readers',
      type: 'string',
      description:
        'One short sentence saying what the picture shows, for visitors who can\'t see it — e.g. "Fluorescence microscopy of astrocytes in mouse brain tissue".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional. A few words shown under the picture. If you add a link below, the caption becomes that link.',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      description: 'Optional. Choose a page on this site, or paste a web address — not both.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'internal',
          title: 'Page on this site',
          type: 'reference',
          to: [{ type: 'project' }, { type: 'publication' }, { type: 'page' }],
        }),
        defineField({
          name: 'external',
          title: 'Web address',
          type: 'url',
          description: 'A full address starting with https://',
        }),
      ],
      validation: (rule) =>
        rule.custom((value: { internal?: unknown; external?: unknown } | undefined) =>
          value?.internal && value?.external
            ? 'Choose a page on this site or a web address, not both.'
            : true
        ),
    }),
  ],
  preview: {
    select: { media: 'image', caption: 'caption', alt: 'alt' },
    prepare: ({ media, caption, alt }) => ({ title: caption || alt || 'Picture', subtitle: 'Picture', media }),
  },
})

const projectSlide = defineArrayMember({
  type: 'reference',
  title: 'Project',
  to: [{ type: 'project' }],
  description: "Shows the project's cover image, with the project's title as the caption, linking to the project.",
})

export const homeHeroField = defineField({
  name: 'hero',
  title: 'Picture banner',
  type: 'object',
  description:
    'The pictures at the top of the home page. Leave the slides empty to show no pictures (the page will still look finished).',
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      description:
        '"Side by side" puts the pictures to the right of the lab name. "Full width" runs them across the whole page, with the lab name written on top.',
      options: {
        list: [
          { title: 'Side by side', value: 'split' },
          { title: 'Full width', value: 'fullBleed' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'split',
    }),
    defineField({
      name: 'autoplay',
      title: 'Rotate slides automatically',
      type: 'boolean',
      description:
        'Moves to the next picture every few seconds. Visitors can always pause it, and it never moves for people who have asked their device to reduce motion.',
      initialValue: true,
    }),
    defineField({
      name: 'slides',
      title: 'Slides',
      type: 'array',
      description: `Up to ${HERO_MAX_SLIDES}. Add a picture, or pick a project to show its cover image. Drag to reorder — the first one shows first.`,
      of: [heroImageSlide, projectSlide],
      validation: (rule) => rule.max(HERO_MAX_SLIDES),
    }),
  ],
})
