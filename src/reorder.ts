/**
 * Pure list-reordering helpers used by the drag-and-drop primitives.
 *
 * These functions are intentionally free of any React / DOM dependency so they
 * can be unit-tested in isolation and reused outside of components.
 */

/**
 * Move the item at index `from` to index `to`, returning a new array.
 *
 * The original array is never mutated. Indices are clamped into the valid
 * range so out-of-bounds drops degrade gracefully instead of throwing.
 *
 * @example
 * reorder(["a", "b", "c"], 0, 2) // => ["b", "c", "a"]
 */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const result = list.slice();
  const len = result.length;
  if (len === 0) return result;

  const clamp = (i: number): number => {
    if (i < 0) return 0;
    if (i > len - 1) return len - 1;
    return Math.trunc(i);
  };

  const src = clamp(from);
  const dest = clamp(to);
  if (src === dest) return result;

  const [moved] = result.splice(src, 1);
  result.splice(dest, 0, moved);
  return result;
}

/**
 * Given the bounding rectangles of the rendered items and a pointer's Y
 * coordinate, compute the index the dragged item should be inserted at.
 *
 * The midpoint of each item is used as the threshold: if the pointer is above
 * the vertical midpoint of an item, the insertion index is that item; once the
 * pointer passes the last midpoint, the index becomes the end of the list.
 *
 * @param tops    Top offsets of each item, in document order.
 * @param heights Heights of each item, aligned with `tops`.
 * @param pointerY Pointer Y coordinate in the same coordinate space as `tops`.
 */
export function getDropIndex(
  tops: readonly number[],
  heights: readonly number[],
  pointerY: number,
): number {
  const count = Math.min(tops.length, heights.length);
  for (let i = 0; i < count; i++) {
    const mid = tops[i] + heights[i] / 2;
    if (pointerY < mid) return i;
  }
  return count;
}

/**
 * Translate a "raw" insertion index (where the dragged item would be inserted
 * if it had already been removed-as-gap) into the `to` argument expected by
 * {@link reorder}, accounting for the source position shift.
 */
export function normalizeInsertIndex(from: number, insertIndex: number): number {
  return insertIndex > from ? insertIndex - 1 : insertIndex;
}
