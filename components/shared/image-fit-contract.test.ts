import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const COMPONENTS = [
  'components/shared/ImageBox.tsx',
  'components/shared/ImageContainer.tsx',
]

describe('shared image components', () => {
  it.each(COMPONENTS)('%s sets an explicit object-fit', (path) => {
    const source = readFileSync(path, 'utf8')
    // Without this the browser default is `fill`, which stretches the
    // bitmap whenever the box aspect ratio differs from the Sanity crop.
    expect(source).toMatch(/object-(cover|contain)/)
  })

  it.each(COMPONENTS)(
    '%s never interpolates an undefined classesWrapper into className',
    (path) => {
      const source = readFileSync(path, 'utf8')
      // `${classesWrapper}` with the prop unset renders the literal
      // string "undefined" as a CSS class.
      expect(source).not.toMatch(/\$\{classesWrapper\}/)
    }
  )

  it.each(COMPONENTS)('%s carries the media-frame hook class', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).toContain('media-frame')
  })

  it('ImageBox positions its own wrapper rather than relying on callers', () => {
    const source = readFileSync('components/shared/ImageBox.tsx', 'utf8')
    // The <img> is absolutely positioned; without `relative` here it
    // resolves against whatever ancestor happens to be positioned. Assert
    // `relative` is an actual class token on the wrapper's className, not
    // just a substring that would also match inside a comment.
    const wrapperClassName = source.match(/className=\{`([^`]*)`\}/)?.[1]
    expect(wrapperClassName?.split(/\s+/)).toContain('relative')
  })
})
