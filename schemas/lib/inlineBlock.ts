import { defineArrayMember } from 'sanity'

// One paragraph style, no lists: the Wix site renders these as plain
// paragraphs of body copy, so headings or lists here would have nowhere
// faithful to go.
export const inlineBlock = defineArrayMember({
  type: 'block',
  styles: [],
  lists: [],
  marks: {
    decorators: [
      { title: 'Italic', value: 'em' },
      { title: 'Strong', value: 'strong' },
    ],
    annotations: [
      {
        name: 'link',
        type: 'object',
        title: 'Link',
        fields: [{ name: 'href', type: 'url', title: 'Url' }],
      },
    ],
  },
})
