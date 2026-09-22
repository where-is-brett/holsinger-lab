/** Wix's Team grid is 5 columns wide (pitch 256 at 1280: x 30, 286, 542, 798,
 *  1054). A full row fills all 5. A partial row is centred by spacing its
 *  items out with a one-column gap between them (1 item -> column 3, 2 ->
 *  columns 2 and 4, 3 -> columns 1, 3 and 5); 4 items are contiguous and
 *  centred as closely as an integer 5-column grid allows.
 *
 *  Implemented on a 9-track CSS grid (5 "real" 196px column-tracks at the odd
 *  track numbers 1/3/5/7/9, alternating with 60px gap-tracks at 2/4/6/8), so
 *  the returned `gridColumnStart` is always odd. */
export function placeRow(count: number, index: number): number {
  if (count <= 0) throw new RangeError(`placeRow: count must be positive, got ${count}`)
  if (index < 0 || index >= count) throw new RangeError(`placeRow: index ${index} out of range for count ${count}`)

  let column: number // 1-5, the "real" column slot
  if (count >= 4) {
    const offset = Math.floor((5 - count) / 2)
    column = offset + index + 1
  } else {
    const span = count * 2 - 1 // items plus one gap column between each
    const offset = Math.floor((5 - span) / 2)
    column = offset + index * 2 + 1
  }
  return column * 2 - 1 // real column N sits at track 2N-1
}
