import { useForm } from '@tanstack/react-form'
import { Link, useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { Money } from '@/components/money'
import { PendingButton } from '@/components/pending-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/admin/components/field-error'
import { useCartView } from '@/features/cart/hooks/use-cart-view'
import { ProductImage } from '@/features/products/components/product-image'
import { ProductLink } from '@/features/products/components/product-link'
import { errorCodeKey } from '@/lib/error-message'
import { runExclusive } from '@/lib/in-flight'
import { useFlatBackground } from '@/lib/use-flat-background'

import { usePlaceOrder } from '../hooks/use-place-order'
import { emptyShipping, shippingSchema, type Shipping } from '../schemas'
import { CheckoutSteps } from './checkout-steps'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </>
  )
}

export function CheckoutPage() {
  const { t } = useTranslation()
  const router = useRouter()
  useFlatBackground()
  const cart = useCartView()
  const placeOrder = usePlaceOrder()

  const form = useForm({
    defaultValues: emptyShipping,
    validators: { onSubmit: shippingSchema },
    onSubmit: ({ value }) =>
      runExclusive('form:checkout', async () => {
        try {
          const order = await placeOrder.mutateAsync(value)
          void router.navigate({
            to: '/orders/$orderId',
            params: { orderId: order.id },
            search: { placed: 1 },
          })
        } catch {
          return // the reason is shown above the button
        }
      }),
  })

  if (cart.isError) return <ErrorState onRetry={() => void cart.refetch()} />
  if (cart.isPending) return <PageSkeleton />

  const error = placeOrder.error
  // a refusal is keyed by the API's error code; the server's message also names the product
  const errorText = !error ? null : t(errorCodeKey(error))
  const errorDetail = error?.code === 'insufficient_stock' ? error.message : null
  const canPlace = !cart.hasUnavailable && cart.totals.totalCents > 0 && !placeOrder.isPending
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  const field = (name: keyof Shipping, autoComplete: string, type?: string) => (
    <form.Field key={name} name={name}>
      {(f) => (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`shipping-${name}`} className="text-sm font-semibold">
            {t(`checkout.fields.${name}`)}
          </Label>
          {name === 'address' ? (
            <Textarea
              id={`shipping-${name}`}
              rows={3}
              autoComplete={autoComplete}
              value={f.state.value}
              onBlur={f.handleBlur}
              onChange={(e) => f.handleChange(e.target.value)}
              aria-invalid={f.state.meta.errors.length > 0}
              className="rounded-xl px-3.5 py-3"
            />
          ) : (
            <Input
              id={`shipping-${name}`}
              type={type}
              autoComplete={autoComplete}
              value={f.state.value}
              onBlur={f.handleBlur}
              onChange={(e) => f.handleChange(e.target.value)}
              aria-invalid={f.state.meta.errors.length > 0}
              className="h-12 rounded-xl px-3.5"
            />
          )}
          <FieldError errors={f.state.meta.errors} keyPrefix="checkout.errors." />
        </div>
      )}
    </form.Field>
  )

  return (
    <div className="flex flex-col gap-7">
      <CheckoutSteps current={2} />
      <div className="flex flex-wrap items-start gap-6">
        <form
          id="checkout-form"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-[22px] border bg-card p-6 sm:p-8"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
              {t('checkout.shipping')}
            </h1>
            <span className="text-muted-foreground">{t('checkout.shippingHint')}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('fullName', 'name')}
            {field('phone', 'tel', 'tel')}
          </div>
          {field('address', 'street-address')}
          <div className="max-w-xs">{field('city', 'address-level2')}</div>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Link to="/cart" className="font-semibold text-brand-text hover:underline">
              ← {t('checkout.backToCart')}
            </Link>
          </div>
        </form>

        <aside
          aria-label={t('checkout.summary')}
          className="glass-strong flex min-w-0 flex-[1_1_360px] flex-col gap-4 rounded-[22px] p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)]"
        >
          <h2 className="m-0 text-lg font-bold">{t('checkout.summary')}</h2>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <li
                key={item.product.id}
                className="card-surface flex items-center gap-3 rounded-[14px] border bg-card p-2.5"
              >
                <ProductImage
                  src={item.product.thumbnail}
                  alt=""
                  className="size-14 shrink-0 rounded-lg [&_img]:object-contain"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <ProductLink
                    productId={item.product.id}
                    className="line-clamp-1 text-sm font-semibold"
                  >
                    {item.product.title}
                  </ProductLink>
                  <span className="text-[13px] text-muted-foreground">
                    {t('checkout.quantity', { n: item.quantity })}
                  </span>
                </div>
                <strong className="text-sm">
                  <Money cents={item.lineCents} />
                </strong>
              </li>
            ))}
          </ul>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-sm">
            <Row label={`${t('cart.summary.subtotal')} (${t('orders.items', { n: count })})`}>
              <Money cents={cart.totals.subtotalCents} />
            </Row>
            <Row label={t('cart.summary.discount')}>
              <span className="font-semibold text-success">
                −<Money cents={cart.totals.discountCents} />
              </span>
            </Row>
          </dl>
          <div className="flex items-baseline justify-between border-t pt-3.5">
            <span className="font-bold">{t('cart.summary.total')}</span>
            <strong
              data-testid="checkout-total"
              className="text-[26px] tracking-[-0.02em] text-brand-text"
            >
              <Money cents={cart.totals.totalCents} />
            </strong>
          </div>
          {errorText ? (
            <p role="alert" className="text-sm text-destructive">
              {errorText}
              {errorDetail ? <span className="block text-xs">{errorDetail}</span> : null}
            </p>
          ) : null}
          <PendingButton
            type="submit"
            form="checkout-form"
            size="lg"
            className="h-[52px] w-full rounded-[14px] text-base font-semibold"
            pending={placeOrder.isPending}
            disabled={!canPlace}
          >
            {t('checkout.place')}
          </PendingButton>
          <p className="m-0 text-center text-xs text-muted-foreground">
            {t('checkout.serverNote')}
          </p>
        </aside>
      </div>
    </div>
  )
}
