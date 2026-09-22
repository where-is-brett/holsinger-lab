import { createHash } from 'node:crypto'

export interface Span { _type: 'span'; _key: string; text: string; marks: string[] }
export interface Block {
  _type: 'block'; _key: string; style: 'normal'; markDefs: never[]; children: Span[]
}

const key = (seed: string) => createHash('sha1').update(seed).digest('hex').slice(0, 12)

/** Paragraph strings -> portable text. `*x*` is italic; nothing else is markup. Keys are
 *  derived from content so a re-import produces deep-equal blocks. */
export function toBlocks(paragraphs: string[], keySeed: string): Block[] {
  return paragraphs.map((p, i) => {
    const parts = p.split(/(\*[^*]+\*)/).filter((s) => s !== '')
    return {
      _type: 'block',
      _key: key(`${keySeed}:${i}`),
      style: 'normal',
      markDefs: [],
      children: parts.map((part, j) => {
        const em = part.startsWith('*') && part.endsWith('*')
        return {
          _type: 'span',
          _key: key(`${keySeed}:${i}:${j}`),
          text: em ? part.slice(1, -1) : part,
          marks: em ? ['em'] : [],
        }
      }),
    }
  })
}
