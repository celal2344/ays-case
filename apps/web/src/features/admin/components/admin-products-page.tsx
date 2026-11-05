import { getRouteApi, Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { runExclusive } from '@/lib/in-flight'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { PaginationBar, RESULTS_ID } from '@/components/pagination-bar'
import { SearchBox } from '@/components/search-box'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { filterByCategory, filterByQuery } from '@/features/products/catalog'
import { Badge } from '@/components/ui/badge'
import { StockBadge } from '@/features/products/components/product-badges'
import { ProductImage } from '@/features/products/components/product-image'
import { ProductPrice } from '@/features/products/components/product-price'
import { ProductModal } from './product-modal'
import { useAdminProducts } from '@/features/products/hooks/use-admin-products'
import { useCategories } from '@/features/products/hooks/use-categories'
import type { AdminProduct as Product } from '@ays/validators'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { useDeleteProduct, useRestoreProduct } from '../hooks/use-product-mutations'
import { ADMIN_PAGE_SIZE, ADMIN_SORTS, type AdminProductSearch, type AdminSort } from '../schemas'

const route = getRouteApi('/_auth/_admin/admin/products/')
const ALL = 'all'

// Sorting and paging run client-side over the filtered rows; the URL owns both states.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
type ProductColumn<TValue> = Column<typeof features, Product, TValue>

const DeleteRequest = createContext<(product: Product) => void>(() => undefined)

function SortHeader<TValue>({
  column,
  label,
}: {
  column: ProductColumn<TValue>
  label: 'title' | 'category' | 'price' | 'stock' | 'rating'
}) {
  const { t } = useTranslation()
  const direction = column.getIsSorted()
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5"
      onClick={() => column.toggleSorting(direction === 'asc')}
    >
      {t(`products.table.${label}`)}
      <Icon className="size-3.5" aria-hidden="true" />
    </Button>
  )
}

function ProductCell({ product }: { product: Product }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-64">
      <Link
        to="/products/$productId"
        params={{ productId: String(product.id) }}
        className="line-clamp-2 font-medium"
      >
        {product.title}
      </Link>
      {product.brand ? (
        <span className="text-xs text-muted-foreground">{product.brand.name}</span>
      ) : null}
      {product.deletedAt ? (
        <Badge variant="destructive" className="ml-2">
          {t('admin.products.deletedBadge')}
        </Badge>
      ) : null}
    </div>
  )
}

function ActionsCell({ product }: { product: Product }) {
  const { t } = useTranslation()
  const requestDelete = useContext(DeleteRequest)
  const restore = useRestoreProduct()
  if (product.deletedAt) {
    return (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={restore.isPending}
          aria-label={t('admin.products.restore', { title: product.title })}
          onClick={() =>
            restore.mutate(product.id, {
              onSuccess: () =>
                toast.success(t('admin.products.restored', { title: product.title })),
            })
          }
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    )
  }
  return (
    <div className="flex justify-end gap-1">
      <Link
        from="/admin/products/"
        to="/admin/products"
        search={(prev) => ({ ...prev, edit: product.id })}
        aria-label={t('admin.products.edit', { title: product.title })}
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <Pencil className="size-4" />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('admin.products.delete', { title: product.title })}
        onClick={() => requestDelete(product)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

const helper = createColumnHelper<typeof features, Product>()
const columns = helper.columns([
  helper.display({
    id: 'thumbnail',
    header: () => <ImageHeader />,
    cell: ({ row }) => (
      <ProductImage src={row.original.thumbnail} alt="" className="size-12 rounded-md" />
    ),
  }),
  helper.accessor('title', {
    header: ({ column }) => <SortHeader column={column} label="title" />,
    cell: ({ row }) => <ProductCell product={row.original} />,
    sortFn: 'text',
  }),
  helper.accessor((row) => row.category.name, {
    id: 'category',
    header: ({ column }) => <SortHeader column={column} label="category" />,
    cell: ({ getValue }) => getValue(),
    sortFn: 'text',
  }),
  helper.accessor('priceCents', {
    id: 'price',
    header: ({ column }) => <SortHeader column={column} label="price" />,
    cell: ({ row }) => <ProductPrice product={row.original} />,
  }),
  helper.accessor('stock', {
    header: ({ column }) => <SortHeader column={column} label="stock" />,
    cell: ({ row }) =>
      row.original.availability === 'in' ? (
        row.original.stock
      ) : (
        <StockBadge product={row.original} />
      ),
  }),
  helper.accessor('rating', {
    header: ({ column }) => <SortHeader column={column} label="rating" />,
    cell: ({ getValue }) => getValue()?.toFixed(1) ?? '–',
  }),
  helper.display({
    id: 'actions',
    header: () => <ActionsHeader />,
    cell: ({ row }) => <ActionsCell product={row.original} />,
  }),
])

function ImageHeader() {
  const { t } = useTranslation()
  return <span className="sr-only">{t('products.table.image')}</span>
}

function ActionsHeader() {
  const { t } = useTranslation()
  return <span className="sr-only">{t('products.table.actions')}</span>
}

export function AdminProductsPage() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const language = usePreferencesStore(selectLanguage)
  const { products, isPending, isError, refetch } = useAdminProducts()
  const { categories } = useCategories()
  const deleteProduct = useDeleteProduct()
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const rows = useMemo(
    () =>
      products
        ? filterByCategory(
            filterByQuery(
              products.filter((p) =>
                search.deleted === 'only'
                  ? p.deletedAt !== null
                  : search.deleted === 'include' || p.deletedAt === null,
              ),
              search.q,
              language,
            ),
            search.category,
          )
        : [],
    [products, search.q, search.category, search.deleted, language],
  )

  const sorting: SortingState = useMemo(
    () => (search.sort ? [{ id: search.sort, desc: search.order === 'desc' }] : []),
    [search.sort, search.order],
  )
  const pageIndex = Math.max(0, (search.page ?? 1) - 1)

  const update = useCallback(
    (change: Partial<AdminProductSearch>, replace = false) =>
      void navigate({
        search: (prev) => ({
          ...prev,
          ...change,
          // any filter or sort change goes back to page 1; paging keeps the rest
          page: 'page' in change ? change.page : undefined,
        }),
        replace,
      }),
    [navigate],
  )

  const table = useTable({
    features,
    columns,
    data: rows,
    state: { sorting, pagination: { pageIndex, pageSize: ADMIN_PAGE_SIZE } },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const first = next[0]
      update(
        first && (ADMIN_SORTS as readonly string[]).includes(first.id)
          ? { sort: first.id as AdminSort, order: first.desc ? 'desc' : 'asc' }
          : { sort: undefined, order: undefined },
      )
    },
    autoResetPageIndex: false,
  })

  const confirmDelete = () => {
    const product = toDelete
    if (!product) return
    setToDelete(null)
    const id = `delete:product:${product.id}`
    void runExclusive(id, () =>
      deleteProduct.mutateAsync(product.id).then(
        () => toast.success(t('admin.products.deleted', { title: product.title }), { id }),
        (error: { message: string }) => toast.error(error.message, { id }),
      ),
    )
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isPending) return <PageSkeleton />
  const deletedItems = [
    { value: 'hide', label: t('admin.products.deletedFilter.hide') },
    { value: 'include', label: t('admin.products.deletedFilter.include') },
    { value: 'only', label: t('admin.products.deletedFilter.only') },
  ]

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
  const current = Math.min(pageIndex + 1, pageCount)
  const shown = table.getRowModel().rows
  const categoryItems = [
    { value: ALL, label: t('products.category.all') },
    ...(categories ?? []).map((c) => ({ value: c.slug, label: c.name })),
  ]

  return (
    <DeleteRequest.Provider value={setToDelete}>
      <div
        id={RESULTS_ID}
        tabIndex={-1}
        className="scroll-mt-[calc(var(--header-h)+1rem)] space-y-4 outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{t('admin.products.title')}</h1>
          <Link
            from="/admin/products/"
            to="/admin/products"
            search={(prev) => ({ ...prev, new: 1 as const })}
            className={buttonVariants({})}
          >
            <Plus className="size-4" />
            {t('admin.products.new')}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search.q ?? ''} onCommit={(q) => update({ q: q || undefined }, true)} />
          <Select
            items={categoryItems}
            value={search.category ?? ALL}
            onValueChange={(value) =>
              update({ category: value === ALL ? undefined : (value ?? undefined) })
            }
          >
            <SelectTrigger aria-label={t('products.category.label')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={deletedItems}
            value={search.deleted ?? 'hide'}
            onValueChange={(value) =>
              update({ deleted: value === 'hide' ? undefined : (value as 'include' | 'only') })
            }
          >
            <SelectTrigger aria-label={t('admin.products.deletedFilter.label')} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deletedItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {total === 0 ? (
          <EmptyState title={t('products.empty.filtered')}>
            <Button
              variant="outline"
              onClick={() => update({ q: undefined, category: undefined, deleted: undefined })}
            >
              {t('products.empty.clear')}
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border bg-card [&_tbody_tr:nth-child(even)]:bg-muted/30">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => {
                        const sorted = header.column.getIsSorted()
                        return (
                          <TableHead
                            key={header.id}
                            aria-sort={
                              sorted === 'asc'
                                ? 'ascending'
                                : sorted === 'desc'
                                  ? 'descending'
                                  : undefined
                            }
                          >
                            {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {shown.map((row) => (
                    <TableRow key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar
              page={{
                items: [],
                total,
                page: current,
                pageCount,
                from: (current - 1) * ADMIN_PAGE_SIZE + 1,
                to: (current - 1) * ADMIN_PAGE_SIZE + shown.length,
              }}
              onPageChange={(page) => update({ page: page > 1 ? page : undefined })}
            />
          </>
        )}

        <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.products.confirmDelete.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.products.confirmDelete.body', { title: toDelete?.title ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('admin.products.confirmDelete.cancel')}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                {t('admin.products.confirmDelete.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <ProductModal
        target={
          search.edit !== undefined
            ? { kind: 'edit', id: search.edit }
            : search.new === 1
              ? { kind: 'new' }
              : null
        }
        section={search.section}
        onSectionChange={(section) =>
          void navigate({ search: (prev) => ({ ...prev, section }), replace: true })
        }
        onClose={() =>
          void navigate({
            search: (prev) => ({ ...prev, new: undefined, edit: undefined, section: undefined }),
          })
        }
      />
    </DeleteRequest.Provider>
  )
}
