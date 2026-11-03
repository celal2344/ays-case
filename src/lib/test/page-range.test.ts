import { describe, expect, it } from 'vitest'

import { getPageRange } from '../page-range'

const E = 'ellipsis'

describe('getPageRange', () => {
  it('lists every page when they fit', () => {
    expect(getPageRange(1, 1)).toEqual([1])
    expect(getPageRange(2, 2)).toEqual([1, 2])
    expect(getPageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('shows the start, middle and end of a long list', () => {
    expect(getPageRange(1, 17)).toEqual([1, 2, 3, 4, 5, E, 17])
    expect(getPageRange(3, 17)).toEqual([1, 2, 3, 4, 5, E, 17])
    expect(getPageRange(6, 17)).toEqual([1, E, 5, 6, 7, E, 17])
    expect(getPageRange(15, 17)).toEqual([1, E, 13, 14, 15, 16, 17])
    expect(getPageRange(17, 17)).toEqual([1, E, 13, 14, 15, 16, 17])
  })

  it('keeps the same number of slots on every page of a long list', () => {
    for (let page = 1; page <= 17; page++) expect(getPageRange(page, 17)).toHaveLength(7)
    for (let page = 1; page <= 100; page++) expect(getPageRange(page, 100)).toHaveLength(7)
  })

  it('handles the boundaries where the siblings meet the first or last page', () => {
    expect(getPageRange(4, 17)).toEqual([1, E, 3, 4, 5, E, 17])
    expect(getPageRange(14, 17)).toEqual([1, E, 13, 14, 15, E, 17])
    expect(getPageRange(5, 8)).toEqual([1, E, 4, 5, 6, E, 8])
  })

  it('always contains the first, current and last page, in order and without duplicates', () => {
    for (const count of [8, 9, 17, 50]) {
      for (let page = 1; page <= count; page++) {
        const pages = getPageRange(page, count).filter((p): p is number => p !== E)
        expect(pages[0]).toBe(1)
        expect(pages.at(-1)).toBe(count)
        expect(pages).toContain(page)
        expect(new Set(pages).size).toBe(pages.length)
        expect([...pages].sort((a, b) => a - b)).toEqual(pages)
      }
    }
  })

  it('clamps a stale current page and widens with siblings', () => {
    expect(getPageRange(99, 17)).toEqual(getPageRange(17, 17))
    expect(getPageRange(0, 17)).toEqual(getPageRange(1, 17))
    expect(getPageRange(10, 30, 2)).toEqual([1, E, 8, 9, 10, 11, 12, E, 30])
  })
})
