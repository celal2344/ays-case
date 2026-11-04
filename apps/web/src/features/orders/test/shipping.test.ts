import { describe, expect, it } from 'vitest'

import { shippingSchema } from '../schemas'

describe('shipping schema (shared with the API)', () => {
  const valid = {
    fullName: 'Avery Perez',
    address: '1 Main Street',
    city: 'Izmir',
    phone: '5551112233',
  }
  const issues = (values: object) => {
    const result = shippingSchema.safeParse({ ...valid, ...values })
    return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
  }

  it('accepts valid details and rejects the empty form', () => {
    expect(shippingSchema.safeParse(valid).success).toBe(true)
    expect(issues({ fullName: '', address: '', city: '', phone: '' }).sort()).toEqual([
      'address',
      'city',
      'fullName',
      'phone',
    ])
  })

  it('checks lengths and the phone format', () => {
    expect(issues({ fullName: 'A' })).toEqual(['fullName'])
    expect(issues({ address: 'x'.repeat(201) })).toEqual(['address'])
    expect(issues({ phone: 'call me' })).toEqual(['phone'])
    expect(issues({ phone: '+90 (555) 111-22-33' })).toEqual([])
  })
})
