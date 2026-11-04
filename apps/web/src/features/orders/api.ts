import { http } from '@/lib/http'

import { remoteCartSchema } from './schemas'

/**
 * DummyJSON "creates" a cart but stores nothing. It silently drops product ids it does not know, so
 * callers send remote ids only; the answer is just a receipt id (docs/api.md).
 */
export async function createRemoteCart(
  userId: number,
  products: { id: number; quantity: number }[],
): Promise<number> {
  const { data } = await http.post<unknown>('/carts/add', { userId, products })
  return remoteCartSchema.parse(data).id
}
