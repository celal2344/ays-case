import { getRouteApi, Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { useAuthStore } from '@/features/auth/store'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { filterUsers } from '../catalog'
import { userErrorText } from '../error-text'
import { useDeleteUser } from '../hooks/use-user-mutations'
import { useUsers } from '../hooks/use-users'
import { roleSchema, USER_PAGE_SIZE, type User, type UserSearch } from '../schemas'

const route = getRouteApi('/_auth/_admin/admin/users/')
const ALL = 'all'

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

interface RowActions {
  requestDelete: (user: User) => void
  /** Why this user cannot be deleted, if so (yourself, the last admin). */
  blocked: (user: User) => 'self' | null
}
const Actions = createContext<RowActions>({ requestDelete: () => undefined, blocked: () => null })

function UserCell({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
        <AvatarFallback>{user.firstName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: User['role'] }) {
  const { t } = useTranslation()
  return (
    <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{t(`userMenu.role.${role}`)}</Badge>
  )
}

function ActionsCell({ user }: { user: User }) {
  const { t } = useTranslation()
  const { requestDelete, blocked } = useContext(Actions)
  const reason = blocked(user)
  const name = `${user.firstName} ${user.lastName}`
  return (
    <div className="flex justify-end gap-1">
      <Link
        to="/admin/users/$userId/edit"
        params={{ userId: user.id }}
        aria-label={t('admin.users.edit', { name })}
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <Pencil className="size-4" />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={reason !== null}
        title={reason ? t(`admin.users.guard.${reason}`) : undefined}
        aria-label={t('admin.users.delete', { name })}
        onClick={() => requestDelete(user)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

function Header({ id }: { id: 'user' | 'username' | 'role' | 'actions' }) {
  const { t } = useTranslation()
  return id === 'actions' ? (
    <span className="sr-only">{t('products.table.actions')}</span>
  ) : (
    <>{t(`admin.users.table.${id}`)}</>
  )
}

const helper = createColumnHelper<typeof features, User>()
const columns = helper.columns([
  helper.display({
    id: 'user',
    header: () => <Header id="user" />,
    cell: ({ row }) => <UserCell user={row.original} />,
  }),
  helper.accessor('username', { header: () => <Header id="username" /> }),
  helper.accessor('role', {
    header: () => <Header id="role" />,
    cell: ({ getValue }) => <RoleBadge role={getValue()} />,
  }),
  helper.display({
    id: 'actions',
    header: () => <Header id="actions" />,
    cell: ({ row }) => <ActionsCell user={row.original} />,
  }),
])

export function UsersPage() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const language = usePreferencesStore(selectLanguage)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { users, isPending, isError, refetch } = useUsers()
  const deleteUser = useDeleteUser()
  const [toDelete, setToDelete] = useState<User | null>(null)

  const rows = useMemo(
    () => (users ? filterUsers(users, search.q, search.role, language) : []),
    [users, search.q, search.role, language],
  )
  const pageIndex = Math.max(0, (search.page ?? 1) - 1)

  const update = useCallback(
    (change: Partial<UserSearch>, replace = false) =>
      void navigate({
        search: (prev) => ({
          ...prev,
          ...change,
          // any filter change goes back to page 1; paging keeps the rest
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
    state: { pagination: { pageIndex, pageSize: USER_PAGE_SIZE } },
    autoResetPageIndex: false,
  })

  const actions = useMemo<RowActions>(
    () => ({
      requestDelete: setToDelete,
      blocked: (user) => (user.id === currentUserId ? 'self' : null),
    }),
    [currentUserId],
  )

  const confirmDelete = () => {
    const user = toDelete
    if (!user) return
    setToDelete(null)
    deleteUser.mutate(user.id, {
      onSuccess: () =>
        toast.success(t('admin.users.deleted', { name: `${user.firstName} ${user.lastName}` })),
      onError: (error) => toast.error(userErrorText(t, error)),
    })
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isPending) return <PageSkeleton />

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / USER_PAGE_SIZE))
  const current = Math.min(pageIndex + 1, pageCount)
  const shown = table.getRowModel().rows
  const roleItems = [
    { value: ALL, label: t('admin.users.table.allRoles') },
    ...roleSchema.options.map((value) => ({ value, label: t(`userMenu.role.${value}`) })),
  ]

  return (
    <Actions.Provider value={actions}>
      <div
        id={RESULTS_ID}
        tabIndex={-1}
        className="scroll-mt-[calc(var(--header-h)+1rem)] space-y-4 outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{t('admin.users.title')}</h1>
          <Link to="/admin/users/new" className={buttonVariants()}>
            <Plus className="size-4" />
            {t('admin.users.new')}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={search.q ?? ''}
            placeholder={t('admin.users.search.placeholder')}
            label={t('admin.users.search.label')}
            onCommit={(q) => update({ q: q || undefined }, true)}
          />
          <Select
            items={roleItems}
            value={search.role ?? ALL}
            onValueChange={(value) =>
              update({ role: value === ALL ? undefined : roleSchema.safeParse(value).data })
            }
          >
            <SelectTrigger aria-label={t('admin.users.table.role')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {total === 0 ? (
          <EmptyState title={t('admin.users.empty')}>
            <Button variant="outline" onClick={() => update({ q: undefined, role: undefined })}>
              {t('products.empty.clear')}
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </TableHead>
                      ))}
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
                from: (current - 1) * USER_PAGE_SIZE + 1,
                to: (current - 1) * USER_PAGE_SIZE + shown.length,
              }}
              onPageChange={(page) => update({ page: page > 1 ? page : undefined })}
            />
          </>
        )}

        <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.users.confirmDelete.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.users.confirmDelete.body', {
                  name: toDelete ? `${toDelete.firstName} ${toDelete.lastName}` : '',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('admin.users.confirmDelete.cancel')}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                {t('admin.users.confirmDelete.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Actions.Provider>
  )
}
