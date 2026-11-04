import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useAddToCart } from '@/features/cart/hooks/use-add-to-cart'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import type { Product } from '../schemas'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

export function ProductTable({ products }: { products: Product[] }) {
  const { t } = useTranslation()
  const addToCart = useAddToCart()
  return (
    <div className="overflow-x-auto rounded-lg border">
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
            <TableRow key={product.id}>
              <TableCell>
                <ProductImage src={product.thumbnail} alt="" className="size-12 rounded-md" />
              </TableCell>
              <TableCell className="max-w-64">
                <Link
                  to="/products/$productId"
                  params={{ productId: String(product.id) }}
                  className="line-clamp-2 font-medium hover:underline"
                >
                  {product.title}
                </Link>
                {product.brand ? (
                  <span className="text-xs text-muted-foreground">{product.brand}</span>
                ) : null}
              </TableCell>
              <TableCell className="capitalize">{product.category.replaceAll('-', ' ')}</TableCell>
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
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={product.stock <= 0}
                  aria-label={t('products.addToCartNamed', { title: product.title })}
                  onClick={() => addToCart(product)}
                >
                  <ShoppingCart className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
