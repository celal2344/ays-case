import { Link, useRouter } from '@tanstack/react-router'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { QuantityStepper } from '@/components/quantity-stepper'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Money } from '@/components/money'
import { ProductImage } from '@/features/products/components/product-image'

import { useCartView } from '../hooks/use-cart-view'
import type { CartItem, CartTotals } from '../selectors'

function Summary({
  totals,
  count,
  canCheckout,
  onCheckout,
}: {
  totals: CartTotals
  count: number
  canCheckout: boolean
  onCheckout: () => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cart.summary.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t('cart.summary.items', { n: count })}</dt>
            <dd />
          </div>
          <div className="flex justify-between">
            <dt>{t('cart.summary.subtotal')}</dt>
            <dd>
              <Money cents={totals.subtotalCents} />
            </dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>{t('cart.summary.discount')}</dt>
            <dd>
              −<Money cents={totals.discountCents} />
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>{t('cart.summary.total')}</dt>
            <dd data-testid="cart-total">
              <Money cents={totals.totalCents} />
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" disabled={!canCheckout} onClick={onCheckout}>
          {t('cart.checkout')}
        </Button>
      </CardFooter>
    </Card>
  )
}

function CartRow({
  item,
  onQuantity,
  onRemove,
}: {
  item: CartItem
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const { product } = item
  return (
    <li className="flex gap-3 rounded-lg border p-3 sm:gap-4">
      <Link
        to="/products/$productId"
        params={{ productId: String(product.id) }}
        className="shrink-0"
        aria-hidden="true"
        tabIndex={-1}
      >
        <ProductImage src={product.thumbnail} alt="" className="size-20 rounded-md" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/products/$productId"
            params={{ productId: String(product.id) }}
            className="line-clamp-2 font-medium hover:underline"
          >
            {product.title}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('cart.remove', { title: product.title })}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        {item.available ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <QuantityStepper value={item.quantity} max={product.stock} onChange={onQuantity} />
            <div className="text-right">
              <p className="font-semibold">
                <Money cents={item.lineCents} />
              </p>
            </div>
          </div>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {t('cart.unavailable')}
          </p>
        )}
      </div>
    </li>
  )
}

export function CartPage() {
  const { t } = useTranslation()
  const cart = useCartView()
  const router = useRouter()

  if (cart.isError) return <ErrorState onRetry={() => void cart.refetch()} />
  if (cart.isPending) return <PageSkeleton />

  if (cart.items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t('cart.title')}</h1>
        <EmptyState title={t('cart.empty')}>
          <Link to="/products" className={buttonVariants({})}>
            <ShoppingBag className="size-4" />
            {t('cart.emptyCta')}
          </Link>
        </EmptyState>
      </div>
    )
  }

  const checkout = () => void router.navigate({ to: '/checkout' })
  const canCheckout = !cart.hasUnavailable && cart.totals.totalCents > 0

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('cart.title')}</h1>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
            {t('cart.clear.action')}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('cart.clear.title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('cart.clear.body')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cart.clear.cancel')}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => cart.clear()}>
                {t('cart.clear.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <CartRow
              key={item.product.id}
              item={item}
              onQuantity={(quantity) =>
                cart.setQuantity(item.product.id, quantity, item.product.stock)
              }
              onRemove={() => cart.remove(item.product.id)}
            />
          ))}
        </ul>

        <div className="hidden lg:block">
          <div className="sticky top-20">
            <Summary
              totals={cart.totals}
              count={cart.count}
              canCheckout={canCheckout}
              onCheckout={checkout}
            />
          </div>
        </div>
      </div>

      {/* mobile / tablet: summary pinned to the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background p-3 shadow-lg lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('cart.summary.total')}</p>
            <p className="font-semibold">
              <Money cents={cart.totals.totalCents} />
            </p>
          </div>
          <Button size="lg" disabled={!canCheckout} onClick={checkout}>
            {t('cart.checkout')}
          </Button>
        </div>
      </div>
    </div>
  )
}
