import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

import type { Product } from '../schemas'
import { ProductCard } from './product-card'

/** A titled carousel of product cards (similar products). */
export function ProductStrip({
  id,
  title,
  products,
}: {
  id: string
  title: string
  products: Product[]
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <Carousel opts={{ align: 'start' }} className="px-10">
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-3/4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0" />
        <CarouselNext className="right-0" />
      </Carousel>
    </section>
  )
}
