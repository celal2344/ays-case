import { Skeleton } from '@/components/ui/skeleton'

import type { Product } from '../schemas'
import { ProductCard } from './product-card'

const GRID = 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className={GRID}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  )
}
