import { describe, expect, it } from 'vitest'

import { formatDate, formatDimensions, formatMoney, formatPrice, formatWeight } from '../format'

describe('format', () => {
  it('formats prices per language', () => {
    expect(formatPrice(1234.5, 'en')).toBe('$1,234.50')
    expect(formatPrice(1234.5, 'tr')).toContain('1.234,50')
  })

  it('formats integer cents, grams and millimetres for display', () => {
    expect(formatMoney(123450, 'en')).toBe('$1,234.50')
    expect(formatWeight(4000, 'en')).toBe('4 kg')
    expect(formatWeight(1250, 'tr')).toBe('1,25 kg')
    expect(formatDimensions({ widthMm: 150, heightMm: 130, depthMm: 235 }, 'en')).toBe(
      '15 × 13 × 23.5 cm',
    )
  })

  it('formats dates per language', () => {
    expect(formatDate('2025-04-30T12:00:00.000Z', 'en')).toBe('Apr 30, 2025')
    expect(formatDate('2025-04-30T12:00:00.000Z', 'tr')).toBe('30 Nis 2025')
  })
})
