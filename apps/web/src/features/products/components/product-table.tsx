import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useAddButton } from '@/features/cart/hooks/use-add-to-cart'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import type { Product } from '../schemas'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductImage } from './product-image'
import { ProductLink } from './product-link'
import { ProductPrice } from './product-price'

function AddToCartIcon({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { add, pending, atMax } = useAddButton(product)
  return (
    <PendingButton
      size="icon-sm"
      variant="outline"
      pending={pending}
      disabled={product.stock <= 0 || atMax}
      aria-label={t(atMax ? 'cart.maxInCart' : 'products.addToCartNamed', { title: product.title })}
      onClick={() => void add()}
    >
      {pending ? null : <ShoppingCart className="size-4" />}
    </PendingButton>
  )
}

export function ProductTable({ products }: { products: Product[] }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto rounded-lg border bg-card [&_tbody_tr:nth-child(even)]:bg-muted/30">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">
              <span className="sr-only">{t('products.table.image')}</span>
            </TableHead>
            <TableHead>{t('products.table.title')}</TableHead>
            <TableHead>{t('products.table.category')}</TableHead>
            <TableHead>{t('products.table.price')}</TableHead>
            <TableHead>{t('products.table.rating')}</TableHead>
            <TableHead>{t('products.table.stock')}</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">{t('products.table.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="card-surface">
              <TableCell>
                <ProductImage src={product.thumbnail} alt="" className="size-12 rounded-md" />
              </TableCell>
              <TableCell className="max-w-64">
                <ProductLink productId={product.id} className="line-clamp-2 font-medium">
                  {product.title}
                </ProductLink>
                {product.brand ? (
                  <span className="text-xs text-muted-foreground">{product.brand.name}</span>
                ) : null}
              </TableCell>
              <TableCell>{product.category.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ProductPrice product={product} />
                  <DiscountBadge product={product} />
                </div>
              </TableCell>
              <TableCell>{product.rating === null ? '–' : product.rating.toFixed(1)}</TableCell>
              <TableCell>
                {product.availability === 'in' ? product.stock : <StockBadge product={product} />}
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <FavoriteButton productId={product.id} title={product.title} />
                <AddToCartIcon product={product} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
