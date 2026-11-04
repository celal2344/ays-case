import { describe, expect, it } from 'vitest'

import { safeRedirect } from '../safe-redirect'

describe('safeRedirect', () => {
  it('keeps same-site paths, with query and hash', () => {
    for (const path of [
      '/',
      '/products',
      '/products?q=a&page=2',
      '/orders/abc#top',
      '/admin/users',
    ]) {
      expect(safeRedirect(path)).toBe(path)
    }
  })

  it('drops external and protocol-relative targets', () => {
    for (const target of [
      '//evil.com',
      'https://evil.com',
      'http://evil.com/products',
      '/\\evil.com',
      '\\\\evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      'javascript:alert(1)',
      'evil.com',
      'products',
      '',
    ]) {
      expect(safeRedirect(target)).toBeUndefined()
    }
  })

  it('passes undefined through', () => {
    expect(safeRedirect(undefined)).toBeUndefined()
  })
})
