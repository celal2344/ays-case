import { getRouteApi, Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { runExclusive } from '@/lib/in-flight'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback/feedback'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { errorCodeKey } from '@/lib/error-message'
import type { AppError } from '@/lib/http-error'

import { useLookupMutations, useLookups } from '../hooks/use-lookups'
import type { LookupInput, LookupRow } from '../lookups-api'
import { fieldsOf, LOOKUP_KINDS, type LookupField, type LookupKind } from '../lookups'

const route = getRouteApi('/_auth/_admin/admin/lookups/$kind')

const display = (row: LookupRow, field: LookupField) => {
  const value = row[field]
  return value === undefined ? '' : String(value)
}

/** A small create/edit dialog; `row` present = edit. The server checks the rules and the uniqueness. */
function LookupDialog({
  kind,
  row,
  open,
  onClose,
}: {
  kind: LookupKind
  row: LookupRow | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const fields = fieldsOf(kind)
  const { create, update } = useLookupMutations(kind)
  const [values, setValues] = useState<Record<LookupField, string>>({
    name: row?.name ?? '',
    slug: row?.slug ?? '',
    sortOrder: row?.sortOrder === undefined ? '' : String(row.sortOrder),
    label: row?.label ?? '',
  })
  const mutation = row ? update : create
  const error: AppError | null = mutation.error

  const toInput = (): LookupInput => ({
    ...(fields.includes('name') ? { name: values.name.trim() } : {}),
    ...(fields.includes('slug') && values.slug.trim() ? { slug: values.slug.trim() } : {}),
    ...(fields.includes('sortOrder') && values.sortOrder.trim()
      ? { sortOrder: Number(values.sortOrder) }
      : {}),
    ...(fields.includes('label') ? { label: values.label.trim() } : {}),
  })

  const submit = () => {
    const done = {
      onSuccess: () => {
        toast.success(t(row ? 'admin.lookups.updated' : 'admin.lookups.created'))
        onClose()
      },
    }
    if (row) update.mutate({ id: row.id, input: toInput() }, done)
    else create.mutate(toInput(), done)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(row ? 'admin.lookups.editTitle' : 'admin.lookups.newTitle')}</DialogTitle>
          <DialogDescription>{t(`admin.lookups.kinds.${kind}`)}</DialogDescription>
        </DialogHeader>
        <form
          id="lookup-form"
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {fields.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`lookup-${field}`}>{t(`admin.lookups.fields.${field}`)}</Label>
              <Input
                id={`lookup-${field}`}
                inputMode={field === 'sortOrder' ? 'numeric' : undefined}
                value={values[field]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              />
              {field === 'slug' ? (
                <p className="text-xs text-muted-foreground">{t('admin.lookups.slugHint')}</p>
              ) : null}
            </div>
          ))}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {t(errorCodeKey(error))}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('admin.form.cancel')}
          </Button>
          <Button type="submit" form="lookup-form" disabled={mutation.isPending}>
            {t(row ? 'admin.form.save' : 'admin.form.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LookupsPage() {
  const { kind } = route.useParams()
  return <LookupsTable key={kind} kind={kind as LookupKind} />
}

function LookupsTable({ kind }: { kind: LookupKind }) {
  const { t } = useTranslation()
  const fields = fieldsOf(kind)
  const { rows, isPending, isError, refetch } = useLookups(kind)
  const { remove } = useLookupMutations(kind)
  const [editing, setEditing] = useState<LookupRow | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<LookupRow | null>(null)
  const [deleteError, setDeleteError] = useState<AppError | null>(null)

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isPending) return <PageSkeleton />

  const confirmDelete = () => {
    const row = toDelete
    if (!row) return
    void runExclusive(`delete:lookup:${kind}:${row.id}`, () =>
      remove.mutateAsync(row.id).then(
        () => {
          setToDelete(null)
          toast.success(t('admin.lookups.deleted'), { id: `delete:lookup:${kind}:${row.id}` })
        },
        (error: Parameters<typeof setDeleteError>[0]) => setDeleteError(error),
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t(`admin.lookups.kinds.${kind}`)}</h1>
        <div className="flex flex-wrap gap-2">
          {LOOKUP_KINDS.filter((k) => k.id !== kind).map((k) => (
            <Link
              key={k.id}
              to="/admin/lookups/$kind"
              params={{ kind: k.id }}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              {t(`admin.lookups.kinds.${k.id}`)}
            </Link>
          ))}
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            {t('admin.lookups.new')}
          </Button>
        </div>
      </div>

      {rows && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map((field) => (
                  <TableHead key={field}>{t(`admin.lookups.fields.${field}`)}</TableHead>
                ))}
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {fields.map((field) => (
                    <TableCell key={field}>{display(row, field)}</TableCell>
                  ))}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('admin.lookups.edit', { name: row.name ?? row.label })}
                        onClick={() => setEditing(row)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('admin.lookups.delete', { name: row.name ?? row.label })}
                        onClick={() => {
                          setDeleteError(null)
                          setToDelete(row)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState title={t('admin.lookups.empty')} />
      )}

      {editing ? (
        <LookupDialog
          key={editing === 'new' ? 'new' : editing.id}
          kind={kind}
          row={editing === 'new' ? null : editing}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.lookups.confirmDelete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.lookups.confirmDelete.body', {
                name: toDelete?.name ?? toDelete?.label ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {t(errorCodeKey(deleteError))}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.lookups.confirmDelete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault() // stay open to show an in-use refusal
                confirmDelete()
              }}
            >
              {t('admin.lookups.confirmDelete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
