import { useForm, useStore } from '@tanstack/react-form'
import { ArrowDown, ArrowUp, Check, Plus, Star, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PageSkeleton, NotFound } from '@/components/feedback/feedback'
import { PendingButton } from '@/components/pending-button'
import { SearchableSelect } from '@/components/searchable-select'
import { UnsavedChangesDialog } from '@/components/unsaved-changes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useProduct } from '@/features/products/hooks/use-product'
import type { ProductDetail } from '@/features/products/schemas'
import { errorCodeKey } from '@/lib/error-message'
import { runExclusive } from '@/lib/in-flight'
import { cn } from '@/lib/utils'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'

import { useLookups } from '../hooks/use-lookups'
import { useCreateProduct, useUpdateProduct } from '../hooks/use-product-mutations'
import {
  CREATE_STEPS,
  PRODUCT_SECTIONS,
  hasIssues,
  validateProductForm,
  type CreateStep,
  type ProductSection,
} from '../product-sections'
import { emptyProductForm, toFormValues, toProductBody, type ProductFormValues } from '../schemas'
import { FieldError } from './field-error'
import { TagPicker } from './tag-picker'

export type ProductModalTarget = { kind: 'new' } | { kind: 'edit'; id: number }

interface Option {
  value: string
  label: string
}

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  errors,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  errors: string[]
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode={inputMode}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errors.length > 0}
      />
      <FieldError errors={errors} />
    </div>
  )
}

function PolicySelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label id={`${id}-label`}>{label}</Label>
      <Select items={options} value={value || null} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger aria-labelledby={`${id}-label`} className="w-full">
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
    </div>
  )
}

/** The section menu: a column on wide screens, tabs along the top on small ones. */
function SectionMenu({
  sections,
  current,
  onSelect,
  disabledAfter,
  flagged,
  done,
}: {
  sections: readonly CreateStep[]
  current: CreateStep
  onSelect: (section: CreateStep) => void
  /** While creating, steps after this index are not reachable yet. */
  disabledAfter: number
  flagged: (section: CreateStep) => boolean
  done: (section: CreateStep) => boolean
}) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('admin.form.sections.label')}
      className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:w-52 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:p-3"
    >
      {sections.map((section, index) => (
        <button
          key={section}
          type="button"
          aria-current={section === current ? 'step' : undefined}
          disabled={index > disabledAfter}
          onClick={() => onSelect(section)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
            section === current
              ? 'bg-muted font-medium'
              : 'text-muted-foreground hover:bg-muted/60',
          )}
        >
          {done(section) ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
          {t(`admin.form.sections.${section}`)}
          {flagged(section) ? (
            <span
              role="img"
              aria-label={t('admin.form.sections.hasErrors')}
              className="ml-auto size-2 rounded-full bg-destructive"
            />
          ) : null}
        </button>
      ))}
    </nav>
  )
}

function ReviewList({ values, categories }: { values: ProductFormValues; categories: Option[] }) {
  const { t } = useTranslation()
  const rows: [string, string][] = [
    [t('admin.form.title'), values.title],
    [t('admin.form.sku'), values.sku],
    [t('admin.form.category'), categories.find((c) => c.value === values.categoryId)?.label ?? ''],
    [t('admin.form.price'), values.price],
    [t('admin.form.stock'), values.stock],
    [t('admin.form.tags'), String(values.tagIds.length)],
    [t('admin.form.images'), String(values.images.length)],
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('admin.form.reviewHint')}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * The form inside the modal. Creating walks the sections as steps (each is checked before "Next", the
 * last is a review); editing moves freely between them and saves from any section, flagging the
 * sections with a problem.
 */
function ProductModalForm({
  product,
  section,
  onSectionChange,
  onClose,
}: {
  product?: ProductDetail
  section: ProductSection | undefined
  onSectionChange: (section: ProductSection) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { categories } = useCategories()
  const brands = useLookups('brands').rows
  const tags = useLookups('tags').rows
  const warranties = useLookups('warranty-policies').rows
  const shippings = useLookups('shipping-policies').rows
  const returns = useLookups('return-policies').rows
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const mutation = product ? update : create
  const editing = product !== undefined

  const tagIdBySlug = new Map(
    (tags ?? []).flatMap((tag) => (tag.slug ? [[tag.slug, tag.id] as const] : [])),
  )
  const form = useForm({
    defaultValues: product ? toFormValues(product, tagIdBySlug) : emptyProductForm,
  })
  const values = useStore(form.store, (s) => s.values)
  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const { issues, imageRows } = useMemo(() => validateProductForm(values), [values])

  // which sections show their problems: all after a failed save, one after a refused "Next"
  const [shown, setShown] = useState<ReadonlySet<ProductSection>>(new Set())
  const [step, setStep] = useState<CreateStep>('general')
  const [reached, setReached] = useState(0)
  const current: CreateStep = editing ? (section ?? 'general') : step

  const { blocker, markSaved } = useUnsavedChangesGuard(
    dirty,
    (next) => next.search.new !== undefined || next.search.edit !== undefined,
  )

  const none: Option = { value: '', label: t('admin.form.none') }
  const policyOptions = (rows: { id: number; label?: string }[] | undefined): Option[] => [
    none,
    ...(rows ?? []).map((row) => ({ value: String(row.id), label: row.label ?? '' })),
  ]
  const brandOptions: Option[] = (brands ?? []).map((row) => ({
    value: String(row.id),
    label: row.name ?? '',
  }))
  const categoryOptions: Option[] = (categories ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  const visible = (field: keyof ProductFormValues, touched: boolean, owner: ProductSection) =>
    (touched || shown.has(owner)) && (issues[field]?.length ?? 0) > 0 ? (issues[field] ?? []) : []

  const go = (target: CreateStep) => {
    if (editing) {
      if (target !== 'review') onSectionChange(target)
    } else {
      setStep(target)
    }
  }

  const next = () => {
    if (current === 'review') return
    const index = CREATE_STEPS.indexOf(current)
    if (hasIssues(issues, current)) {
      setShown((prev) => new Set(prev).add(current as ProductSection))
      return
    }
    const target = CREATE_STEPS[index + 1]!
    setReached((prev) => Math.max(prev, index + 1))
    setStep(target)
  }

  const submit = () => {
    const invalid = PRODUCT_SECTIONS.filter((s) => hasIssues(issues, s))
    if (invalid.length > 0) {
      setShown(new Set(PRODUCT_SECTIONS))
      go(invalid[0]!)
      return
    }
    void runExclusive(`form:product:${product?.id ?? 'new'}`, async () => {
      try {
        const body = toProductBody(values)
        if (product) await update.mutateAsync({ id: product.id, patch: body })
        else await create.mutateAsync(body)
      } catch {
        return // the error is shown below the form
      }
      markSaved()
      toast.success(t(product ? 'admin.form.updated' : 'admin.form.created'))
      onClose()
    })
  }

  const isLast = current === 'review'
  const sections: readonly CreateStep[] = editing ? PRODUCT_SECTIONS : CREATE_STEPS

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        if (editing || isLast) submit()
        else next()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SectionMenu
          sections={sections}
          current={current}
          onSelect={go}
          disabledAfter={editing ? sections.length : reached}
          flagged={(s) => s !== 'review' && shown.has(s) && hasIssues(issues, s)}
          done={(s) => !editing && CREATE_STEPS.indexOf(s) < reached}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4" hidden={current !== 'general'}>
            <form.Field name="title">
              {(field) => (
                <TextField
                  id="title"
                  label={t('admin.form.title')}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={visible('title', field.state.meta.isTouched, 'general')}
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
                    aria-invalid={
                      visible('description', field.state.meta.isTouched, 'general').length > 0
                    }
                  />
                  <FieldError
                    errors={visible('description', field.state.meta.isTouched, 'general')}
                  />
                </div>
              )}
            </form.Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="sku">
                {(field) => (
                  <TextField
                    id="sku"
                    label={t('admin.form.sku')}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    errors={visible('sku', field.state.meta.isTouched, 'general')}
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
                    errors={visible('barcode', field.state.meta.isTouched, 'general')}
                  />
                )}
              </form.Field>
              <form.Field name="categoryId">
                {(field) => {
                  const errors = visible('categoryId', field.state.meta.isTouched, 'general')
                  return (
                    <div className="space-y-1.5">
                      <Label htmlFor="category">{t('admin.form.category')}</Label>
                      <SearchableSelect
                        id="category"
                        label={t('admin.form.category')}
                        options={categoryOptions}
                        value={field.state.value}
                        onChange={field.handleChange}
                        placeholder={t('admin.form.categoryPlaceholder')}
                        emptyText={t('admin.form.noMatches')}
                        invalid={errors.length > 0}
                      />
                      <FieldError errors={errors} />
                    </div>
                  )
                }}
              </form.Field>
              <form.Field name="brandId">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">{t('admin.form.brand')}</Label>
                    <SearchableSelect
                      id="brand"
                      label={t('admin.form.brand')}
                      options={brandOptions}
                      value={field.state.value}
                      onChange={field.handleChange}
                      placeholder={t('admin.form.none')}
                      emptyText={t('admin.form.noMatches')}
                      clearable
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2" hidden={current !== 'pricing'}>
            {(
              [
                ['price', 'admin.form.price', 'decimal'],
                ['discountPercentage', 'admin.form.discount', 'decimal'],
                ['stock', 'admin.form.stock', 'numeric'],
                ['lowStockThreshold', 'admin.form.lowStock', 'numeric'],
                ['minimumOrderQuantity', 'admin.form.moq', 'numeric'],
              ] as const
            ).map(([name, label, inputMode]) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <TextField
                    id={name}
                    label={t(label)}
                    inputMode={inputMode}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    errors={visible(name, field.state.meta.isTouched, 'pricing')}
                  />
                )}
              </form.Field>
            ))}
          </div>

          <div className="space-y-5" hidden={current !== 'size'}>
            <div className="grid gap-4 sm:grid-cols-2">
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
                      errors={visible(name, field.state.meta.isTouched, 'size')}
                    />
                  )}
                </form.Field>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <form.Field name="warrantyPolicyId">
                {(field) => (
                  <PolicySelect
                    id="warranty"
                    label={t('admin.form.warranty')}
                    options={policyOptions(warranties)}
                    value={field.state.value}
                    onChange={field.handleChange}
                    placeholder={t('admin.form.none')}
                  />
                )}
              </form.Field>
              <form.Field name="shippingPolicyId">
                {(field) => (
                  <PolicySelect
                    id="shipping"
                    label={t('admin.form.shipping')}
                    options={policyOptions(shippings)}
                    value={field.state.value}
                    onChange={field.handleChange}
                    placeholder={t('admin.form.none')}
                  />
                )}
              </form.Field>
              <form.Field name="returnPolicyId">
                {(field) => (
                  <PolicySelect
                    id="returns"
                    label={t('admin.form.returns')}
                    options={policyOptions(returns)}
                    value={field.state.value}
                    onChange={field.handleChange}
                    placeholder={t('admin.form.none')}
                  />
                )}
              </form.Field>
            </div>
          </div>

          <div hidden={current !== 'tags'}>
            <form.Field name="tagIds">
              {(field) => (
                <TagPicker
                  tags={tags ?? []}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </div>

          <div hidden={current !== 'images'}>
            <form.Field name="images" mode="array">
              {(images) => (
                <div className="space-y-3">
                  {images.state.value.map((_, index) => (
                    <form.Field key={index} name={`images[${index}].url`}>
                      {(field) => {
                        const message = imageRows[index]
                        const errors =
                          (field.state.meta.isTouched || shown.has('images')) && message
                            ? [message]
                            : []
                        return (
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
                                aria-invalid={errors.length > 0}
                              />
                              <FieldError errors={errors} />
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
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
                        )
                      }}
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
          </div>

          {current === 'review' ? (
            <ReviewList values={values} categories={categoryOptions} />
          ) : null}
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 items-center rounded-none border-t p-3">
        {mutation.error ? (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {t(errorCodeKey(mutation.error))}
            {mutation.error.code === 'duplicate' ? ` ${mutation.error.message}` : ''}
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>
          {t('admin.form.cancel')}
        </Button>
        {!editing && current !== 'general' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => go(CREATE_STEPS[CREATE_STEPS.indexOf(current) - 1]!)}
          >
            {t('admin.form.back')}
          </Button>
        ) : null}
        {!editing && !isLast ? (
          <Button type="submit">{t('admin.form.next')}</Button>
        ) : (
          <PendingButton type="submit" pending={mutation.isPending}>
            {t(editing ? 'admin.form.save' : 'admin.form.create')}
          </PendingButton>
        )}
      </DialogFooter>
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  )
}

/**
 * The product form as a large modal, open while the URL says so (`?new=1` or `?edit=12`, optionally
 * `&section=images`). Closing goes back to the plain list; unsaved changes are asked about by the
 * navigation guard inside the form.
 */
export function ProductModal({
  target,
  section,
  onSectionChange,
  onClose,
}: {
  target: ProductModalTarget | null
  section: ProductSection | undefined
  onSectionChange: (section: ProductSection) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const open = target !== null
  const editId = target?.kind === 'edit' ? target.id : 0
  const { product, notFound, isPending } = useProduct(editId)
  // the form maps the product's tags to ids, so the tag list must be there before it starts
  const tags = useLookups('tags')
  const editing = target?.kind === 'edit'

  let body: ReactNode = null
  if (open) {
    if (editing && (isPending || tags.isPending)) body = <PageSkeleton />
    else if (editing && (notFound || !product))
      body = (
        <div className="p-4">
          <NotFound />
        </div>
      )
    else {
      body = (
        <ProductModalForm
          // a different product gets a fresh form with fresh defaults
          key={product?.id ?? 'new'}
          {...(editing && product ? { product } : {})}
          section={section}
          onSectionChange={onSectionChange}
          onClose={onClose}
        />
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="top-0 left-0 flex h-svh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[min(92svh,52rem)] sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle>{t(editing ? 'admin.form.editTitle' : 'admin.form.newTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('admin.form.modalHint')}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
