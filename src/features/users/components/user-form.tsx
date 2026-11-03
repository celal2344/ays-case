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
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'
import { FieldError } from '@/features/admin/components/field-error'
import { useAuthStore } from '@/features/auth/store'

import { isUsernameTaken } from '../catalog'
import { demoteGuard } from '../guardrails'
import { useCreateUser, useUpdateUser } from '../hooks/use-user-mutations'
import { useUsers } from '../hooks/use-users'
import { userErrorText } from '../error-text'
import {
  emptyUserForm,
  toUserFormValues,
  toUserInput,
  toUserPatch,
  USER_ERRORS,
  userFormSchema,
  roleSchema,
  type User,
} from '../schemas'

/** One form for both creating and editing a user (`user` present = edit). */
export function UserForm({ user }: { user?: User }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { users } = useUsers()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const create = useCreateUser()
  const update = useUpdateUser()
  const mutation = user ? update : create

  // taking away the admin role is refused for yourself and for the last admin
  const roleLock = user && users ? demoteGuard(users, user.id, 'user', currentUserId) : null

  const form = useForm({
    defaultValues: user ? toUserFormValues(user) : emptyUserForm,
    validators: { onSubmit: userFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (user) await update.mutateAsync({ id: user.id, patch: toUserPatch(value) })
        else await create.mutateAsync(toUserInput(value))
      } catch {
        return // the error is shown below the form
      }
      markSaved()
      toast.success(t(user ? 'admin.users.form.updated' : 'admin.users.form.created'))
      void router.navigate({ to: '/admin/users' })
    },
  })

  const dirty = useStore(form.store, (s) => s.isDirty)
  const { blocker, markSaved } = useUnsavedChangesGuard(dirty)

  const roleItems = roleSchema.options.map((value) => ({
    value,
    label: t(`userMenu.role.${value}`),
  }))

  return (
    <>
      <form
        className="max-w-xl space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="username"
          validators={{
            onChange: ({ value }) =>
              users && value.trim() && isUsernameTaken(users, value, user?.id)
                ? USER_ERRORS.usernameTaken
                : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('admin.users.form.username')}</Label>
              <Input
                id="username"
                autoComplete="off"
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
          <form.Field name="firstName">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="firstName">{t('admin.users.form.firstName')}</Label>
                <Input
                  id="firstName"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
          <form.Field name="lastName">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="lastName">{t('admin.users.form.lastName')}</Label>
                <Input
                  id="lastName"
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

        <form.Field name="email">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('admin.users.form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <div className="space-y-1.5">
              <Label id="role-label">{t('admin.users.form.role')}</Label>
              <Select
                items={roleItems}
                value={field.state.value}
                disabled={roleLock !== null}
                onValueChange={(value) => field.handleChange(value ?? 'user')}
              >
                <SelectTrigger aria-labelledby="role-label" className="w-full sm:w-56">
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
              <p className="text-xs text-muted-foreground">
                {roleLock ? t(`admin.users.guard.${roleLock}`) : t('admin.users.form.roleHint')}
              </p>
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {userErrorText(t, mutation.error)}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(user ? 'admin.users.form.save' : 'admin.users.form.create')}
          </Button>
          <Link to="/admin/users" className={buttonVariants({ variant: 'outline' })}>
            {t('admin.form.cancel')}
          </Link>
        </div>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
