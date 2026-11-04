export type PageItem = number | 'ellipsis'

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/**
 * The page buttons to show: first and last page, the current page and `siblings` on each side, with
 * ellipses between. Beyond `2 * siblings + 5` pages it always returns exactly that many slots, so the
 * pager keeps its width while paging (`1 … 5 6 7 … 17`, `1 2 3 4 5 … 17`, `1 … 13 14 15 16 17`).
 */
export function getPageRange(current: number, pageCount: number, siblings = 1): PageItem[] {
  const slots = siblings * 2 + 5
  if (pageCount <= slots) return range(1, Math.max(1, pageCount))

  const page = Math.min(Math.max(1, Math.trunc(current) || 1), pageCount)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, pageCount)
  const leftDots = left > 2
  const rightDots = right < pageCount - 1
  const edge = slots - 2 // buttons shown next to the single ellipsis, first/last page included

  if (!leftDots) return [...range(1, edge), 'ellipsis', pageCount]
  if (!rightDots) return [1, 'ellipsis', ...range(pageCount - edge + 1, pageCount)]
  return [1, 'ellipsis', ...range(left, right), 'ellipsis', pageCount]
}
