import { useForm } from '@tanstack/react-form'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { Money } from '@/components/money'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/admin/components/field-error'
import { useCartView } from '@/features/cart/hooks/use-cart-view'
import { ProductImage } from '@/features/products/components/product-image'
import { errorCodeKey } from '@/lib/error-message'

import { usePlaceOrder } from '../hooks/use-place-order'
import { emptyShipping, shippingSchema, type Shipping } from '../schemas'
import { CheckoutSteps } from './checkout-steps'
import { TotalsList } from './order-totals'

const FIELDS: { name: keyof Shipping; autoComplete: string; type?: string }[] = [
  { name: 'fullName', autoComplete: 'name' },
  { name: 'address', autoComplete: 'street-address' },
  { name: 'city', autoComplete: 'address-level2' },
  { name: 'phone', autoComplete: 'tel', type: 'tel' },
]

export function CheckoutPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const cart = useCartView()
  const placeOrder = usePlaceOrder()

  const form = useForm({
    defaultValues: emptyShipping,
    validators: { onSubmit: shippingSchema },
    onSubmit: async ({ value }) => {
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
    },
  })

  if (cart.isError) return <ErrorState onRetry={() => void cart.refetch()} />
  if (cart.isPending) return <PageSkeleton />

  const error = placeOrder.error
  // a refusal is keyed by the API's error code; the server's message also names the product
  const errorText = !error ? null : t(errorCodeKey(error))
  const errorDetail = error?.code === 'insufficient_stock' ? error.message : null
  const canPlace = !cart.hasUnavailable && cart.totals.totalCents > 0 && !placeOrder.isPending

  return (
    <div className="space-y-4">
      <CheckoutSteps current={2} />
      <h1 className="text-2xl font-semibold">{t('checkout.title')}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <form
          id="checkout-form"
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.shipping')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ name, autoComplete, type }) => (
                <form.Field key={name} name={name}>
                  {(field) => (
                    <div
                      className={name === 'address' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}
                    >
                      <Label htmlFor={`shipping-${name}`}>{t(`checkout.fields.${name}`)}</Label>
                      <Input
                        id={`shipping-${name}`}
                        type={type}
                        autoComplete={autoComplete}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      <FieldError errors={field.state.meta.errors} keyPrefix="checkout.errors." />
                    </div>
                  )}
                </form.Field>
              ))}
            </CardContent>
          </Card>
        </form>

        <div>
          <Card className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <CardHeader>
              <CardTitle>{t('checkout.summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li key={item.product.id} className="flex items-center gap-3 text-sm">
                    <ProductImage
                      src={item.product.thumbnail}
                      alt=""
                      className="size-12 shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium">{item.product.title}</p>
                      <p className="text-muted-foreground">
                        {t('checkout.quantity', { n: item.quantity })}
                      </p>
                    </div>
                    <p className="font-medium">
                      <Money cents={item.lineCents} />
                    </p>
                  </li>
                ))}
              </ul>
              <TotalsList totals={cart.totals} testId="checkout-total" />
              {errorText ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorText}
                  {errorDetail ? <span className="block text-xs">{errorDetail}</span> : null}
                </p>
              ) : null}
              <Button
                type="submit"
                form="checkout-form"
                size="lg"
                className="w-full"
                disabled={!canPlace}
              >
                {placeOrder.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('checkout.place')}
              </Button>
              <Link
                to="/cart"
                className={buttonVariants({ variant: 'ghost', className: 'w-full' })}
              >
                {t('checkout.backToCart')}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
