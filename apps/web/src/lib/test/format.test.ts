import { describe, expect, it } from 'vitest'

import { formatDate, formatPrice } from '../format'

describe('format', () => {
  it('formats prices per language', () => {
    expect(formatPrice(1234.5, 'en')).toBe('$1,234.50')
    expect(formatPrice(1234.5, 'tr')).toContain('1.234,50')
  })

  it('formats dates per language', () => {
    expect(formatDate('2025-04-30T12:00:00.000Z', 'en')).toBe('Apr 30, 2025')
    expect(formatDate('2025-04-30T12:00:00.000Z', 'tr')).toBe('30 Nis 2025')
  })
})
