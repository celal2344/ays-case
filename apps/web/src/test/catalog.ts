import { HttpResponse, http } from 'msw'

import type { Product } from '@ays/validators'

import { fixtureProducts } from './fixtures/products'
import { server } from './msw/server'

/** Makes the mocked API serve `change(fixtureProducts)` as the catalog, as if an admin had edited it. */
export function serveCatalog(change: (products: Product[]) => Product[]) {
  server.use(
    http.get('http://localhost/api/products', () =>
      HttpResponse.json({ data: change(fixtureProducts) }),
    ),
  )
}
