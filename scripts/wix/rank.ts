// orderRank values for imported documents. @sanity/orderable-document-list
// stores LexoRank strings ("0|100008:") and orders lexicographically; any
// well-formed rank is valid and the Studio re-ranks on drag. These start at
// "0|0a0000:" -- *below* the existing "0|1xxxxx:" ranks, so Wix-ordered
// profiles come first and Sanity-only profiles (untouched by the import)
// follow them -- and step by "1000" (base 36) so there is room to drag
// between them. 60 steps stay below "0|100000:".
const BASE = parseInt('0a0000', 36)
const STEP = parseInt('1000', 36)

export function rankAt(index: number): string {
  return `0|${(BASE + index * STEP).toString(36).padStart(6, '0')}:`
}
