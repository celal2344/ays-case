import { useForm, useStore } from '@tanstack/react-form'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
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
import type { ProductDetail } from '@/features/products/schemas'
import { errorCodeKey } from '@/lib/error-message'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'

import { useCreateProduct, useUpdateProduct } from '../hooks/use-product-mutations'
import { useLookups } from '../hooks/use-lookups'
import {
  emptyProductForm,
  productFormSchema,
  toFormValues,
  toProductBody,
  type ProductFormValues,
} from '../schemas'
import { FieldError } from './field-error'

interface Option {
  value: string
  label: string
}

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  onBlur,
  errors,
  type,
  inputMode,
}: {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  errors: unknown[]
  type?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errors.length > 0}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError errors={errors} />
    </div>
  )
}

function SelectField({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  errors,
}: {
  id: string
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  errors: unknown[]
}) {
  return (
    <div className="space-y-1.5">
      <Label id={`${id}-label`}>{label}</Label>
      <Select items={options} value={value || null} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger
          aria-labelledby={`${id}-label`}
          aria-invalid={errors.length > 0}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={errors} />
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  )
}

/** One form for both creating and editing a product (`product` present = edit). */
export function ProductForm({ product }: { product?: ProductDetail }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { categories } = useCategories()
  const brands = useLookups('brands').rows
  const tags = useLookups('tags').rows
  const warranties = useLookups('warranty-policies').rows
  const shippings = useLookups('shipping-policies').rows
  const returns = useLookups('return-policies').rows
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const mutation = product ? update : create

  const tagIdBySlug = new Map(
    (tags ?? []).flatMap((tag) => (tag.slug ? [[tag.slug, tag.id] as const] : [])),
  )

  const form = useForm({
    defaultValues: product ? toFormValues(product, tagIdBySlug) : emptyProductForm,
    validators: { onSubmit: productFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const body = toProductBody(value)
        if (product) await update.mutateAsync({ id: product.id, patch: body })
        else await create.mutateAsync(body)
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

  const none: Option = { value: '', label: t('admin.form.none') }
  const options = (
    rows: { id: number; name?: string; label?: string }[] | undefined,
    optional: boolean,
  ) => [
    ...(optional ? [none] : []),
    ...(rows ?? []).map((row) => ({ value: String(row.id), label: row.name ?? row.label ?? '' })),
  ]
  const categoryOptions = (categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))

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
        <Group title={t('admin.form.groups.basics')}>
          <form.Field name="title">
            {(field) => (
              <TextField
                id="title"
                label={t('admin.form.title')}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                errors={field.state.meta.errors}
              />
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
            <form.Field name="sku">
              {(field) => (
                <TextField
                  id="sku"
                  label={t('admin.form.sku')}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="barcode">
              {(field) => (
                <TextField
                  id="barcode"
                  label={t('admin.form.barcode')}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="categoryId">
              {(field) => (
                <SelectField
                  id="category"
                  label={t('admin.form.category')}
                  options={categoryOptions}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder={t('admin.form.categoryPlaceholder')}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="brandId">
              {(field) => (
                <SelectField
                  id="brand"
                  label={t('admin.form.brand')}
                  options={options(brands, true)}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder={t('admin.form.none')}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          </div>
        </Group>

        <Group title={t('admin.form.groups.pricing')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field name="price">
              {(field) => (
                <TextField
                  id="price"
                  label={t('admin.form.price')}
                  inputMode="decimal"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="discountPercentage">
              {(field) => (
                <TextField
                  id="discountPercentage"
                  label={t('admin.form.discount')}
                  inputMode="decimal"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="stock">
              {(field) => (
                <TextField
                  id="stock"
                  label={t('admin.form.stock')}
                  inputMode="numeric"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="lowStockThreshold">
              {(field) => (
                <TextField
                  id="lowStockThreshold"
                  label={t('admin.form.lowStock')}
                  inputMode="numeric"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="minimumOrderQuantity">
              {(field) => (
                <TextField
                  id="minimumOrderQuantity"
                  label={t('admin.form.moq')}
                  inputMode="numeric"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          </div>
        </Group>

        <Group title={t('admin.form.groups.size')}>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ['weightKg', 'admin.form.weight'],
                ['widthCm', 'admin.form.width'],
                ['heightCm', 'admin.form.height'],
                ['depthCm', 'admin.form.depth'],
              ] as const
            ).map(([name, label]) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <TextField
                    id={name}
                    label={t(label)}
                    inputMode="decimal"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    errors={field.state.meta.errors}
                  />
                )}
              </form.Field>
            ))}
          </div>
        </Group>

        <Group title={t('admin.form.groups.policies')}>
          <div className="grid gap-5 sm:grid-cols-3">
            <form.Field name="warrantyPolicyId">
              {(field) => (
                <SelectField
                  id="warranty"
                  label={t('admin.form.warranty')}
                  options={options(warranties, true)}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder={t('admin.form.none')}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="shippingPolicyId">
              {(field) => (
                <SelectField
                  id="shipping"
                  label={t('admin.form.shipping')}
                  options={options(shippings, true)}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder={t('admin.form.none')}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="returnPolicyId">
              {(field) => (
                <SelectField
                  id="returns"
                  label={t('admin.form.returns')}
                  options={options(returns, true)}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder={t('admin.form.none')}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          </div>
        </Group>

        <Group title={t('admin.form.tags')}>
          <form.Field name="tagIds">
            {(field) => (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('admin.form.tags')}>
                {(tags ?? []).map((tag) => {
                  const id = String(tag.id)
                  const selected = field.state.value.includes(id)
                  return (
                    <Button
                      key={tag.id}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      onClick={() =>
                        field.handleChange(
                          selected
                            ? field.state.value.filter((v) => v !== id)
                            : [...field.state.value, id],
                        )
                      }
                    >
                      {tag.name}
                    </Button>
                  )
                })}
              </div>
            )}
          </form.Field>
        </Group>

        <Group title={t('admin.form.images')}>
          <form.Field name="images" mode="array">
            {(images) => (
              <div className="space-y-3">
                {images.state.value.map((_, index) => (
                  <form.Field key={index} name={`images[${index}].url`}>
                    {(field) => (
                      <div className="flex items-start gap-3">
                        <ProductImage
                          src={field.state.value.trim() || null}
                          alt=""
                          className="size-16 shrink-0 rounded-md border"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <Input
                            aria-label={t('admin.form.imageUrl', { n: index + 1 })}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={field.state.meta.errors.length > 0}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <form.Field name="primaryImage">
                            {(primary) => (
                              <Button
                                type="button"
                                size="icon"
                                variant={primary.state.value === index ? 'default' : 'outline'}
                                aria-pressed={primary.state.value === index}
                                aria-label={t('admin.form.makePrimary', { n: index + 1 })}
                                onClick={() => primary.handleChange(index)}
                              >
                                <Star className="size-4" />
                              </Button>
                            )}
                          </form.Field>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={index === 0}
                            aria-label={t('admin.form.moveUp', { n: index + 1 })}
                            onClick={() => images.moveValue(index, index - 1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={index === images.state.value.length - 1}
                            aria-label={t('admin.form.moveDown', { n: index + 1 })}
                            onClick={() => images.moveValue(index, index + 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={t('admin.form.removeImage', { n: index + 1 })}
                            onClick={() => images.removeValue(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </form.Field>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => images.pushValue({ url: '' })}
                >
                  <Plus className="size-4" />
                  {t('admin.form.addImage')}
                </Button>
                <p className="text-xs text-muted-foreground">{t('admin.form.imagesHint')}</p>
              </div>
            )}
          </form.Field>
        </Group>

        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(errorCodeKey(mutation.error))}
            {mutation.error.code === 'duplicate' ? ` ${mutation.error.message}` : ''}
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

export type { ProductFormValues }
