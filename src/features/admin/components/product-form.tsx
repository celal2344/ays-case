import { useForm, useStore } from '@tanstack/react-form'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { UnsavedChangesDialog } from '@/components/unsaved-changes'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ProductImage } from '@/features/products/components/product-image'
import { useCategories } from '@/features/products/hooks/use-categories'
import type { Product } from '@/features/products/schemas'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'
import { errorMessageKey } from '@/lib/error-message'

import { useCreateProduct, useUpdateProduct } from '../hooks/use-product-mutations'
import {
  emptyProductForm,
  productFormSchema,
  toFormValues,
  toNewProduct,
  toProductPatch,
} from '../schemas'
import { FieldError } from './field-error'

/** One form for both creating and editing a product (`product` present = edit). */
export function ProductForm({ product }: { product?: Product }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { categories } = useCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const mutation = product ? update : create

  const form = useForm({
    defaultValues: product ? toFormValues(product) : emptyProductForm,
    validators: { onSubmit: productFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (product) await update.mutateAsync({ id: product.id, patch: toProductPatch(value) })
        else await create.mutateAsync(toNewProduct(value))
      } catch {
        return // the error is shown below the form
      }
      markSaved()
      toast.success(t(product ? 'admin.form.updated' : 'admin.form.created'))
      void router.navigate({ to: '/admin/products' })
    },
  })

  const dirty = useStore(form.store, (s) => s.isDirty)
  const { blocker, markSaved } = useUnsavedChangesGuard(dirty)

  const categoryItems = (categories ?? []).map((c) => ({ value: c.slug, label: c.name }))

  return (
    <>
      <form
        className="max-w-2xl space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field name="title">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="title">{t('admin.form.title')}</Label>
              <Input
                id="title"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('admin.form.description')}</Label>
              <Textarea
                id="description"
                rows={4}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="category">
            {(field) => (
              <div className="space-y-1.5">
                <Label id="category-label">{t('admin.form.category')}</Label>
                <Select
                  items={categoryItems}
                  value={field.state.value || null}
                  onValueChange={(value) => field.handleChange(value ?? '')}
                >
                  <SelectTrigger
                    aria-labelledby="category-label"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="w-full"
                  >
                    <SelectValue placeholder={t('admin.form.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="brand">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="brand">{t('admin.form.brand')}</Label>
                <Input
                  id="brand"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <form.Field name="price">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="price">{t('admin.form.price')}</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
          <form.Field name="discountPercentage">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="discountPercentage">{t('admin.form.discount')}</Label>
                <Input
                  id="discountPercentage"
                  inputMode="decimal"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
          <form.Field name="stock">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="stock">{t('admin.form.stock')}</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="thumbnail">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="thumbnail">{t('admin.form.thumbnail')}</Label>
              <div className="flex items-start gap-3">
                <ProductImage
                  src={field.state.value.trim()}
                  alt={t('admin.form.preview')}
                  className="size-20 shrink-0 rounded-md border"
                />
                <div className="flex-1 space-y-1.5">
                  <Input
                    id="thumbnail"
                    type="url"
                    placeholder="https://"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.form.thumbnailHint')}</p>
                  <FieldError errors={field.state.meta.errors} />
                </div>
              </div>
            </div>
          )}
        </form.Field>

        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.kind === 'validation'
              ? mutation.error.message
              : t(errorMessageKey(mutation.error))}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(product ? 'admin.form.save' : 'admin.form.create')}
          </Button>
          <Link to="/admin/products" className={buttonVariants({ variant: 'outline' })}>
            {t('admin.form.cancel')}
          </Link>
        </div>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
