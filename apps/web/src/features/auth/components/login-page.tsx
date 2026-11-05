import { useForm } from '@tanstack/react-form'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PendingButton } from '@/components/pending-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessageKey } from '@/lib/error-message'
import { runExclusive } from '@/lib/in-flight'

import { DEFAULT_LANDING } from '../context'
import { selectIsAuthenticated, useAuthStore } from '../store'
import { DEMO_ACCOUNTS } from '../demo-accounts'
import { useLogin } from '../hooks/use-login'
import { loginFormSchema } from '../schemas'

const route = getRouteApi('/login')

export function LoginPage() {
  const { t } = useTranslation()
  const { redirect } = route.useSearch()
  const login = useLogin(redirect)
  const navigate = useNavigate()
  const signedIn = useAuthStore(selectIsAuthenticated)

  // the route does not wait for the session; once it is known to be a signed-in user, leave
  useEffect(() => {
    if (signedIn) void navigate({ href: redirect ?? DEFAULT_LANDING, replace: true })
  }, [signedIn, redirect, navigate])

  const form = useForm({
    defaultValues: { username: '', password: '' },
    validators: { onSubmit: loginFormSchema },
    onSubmit: ({ value }) =>
      runExclusive('form:login', () => login.mutateAsync(value).catch(() => undefined)),
  })

  const error = login.error
  const errorText = error
    ? error.kind === 'validation'
      ? error.message
      : t(errorMessageKey(error))
    : null

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
          <CardDescription>{t('login.demoNote')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <form.Field name="username">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>{t('login.username')}</Label>
                  <Input
                    id={field.name}
                    autoComplete="username"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-destructive">{t('login.required')}</p>
                  ) : null}
                </div>
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>{t('login.password')}</Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-destructive">{t('login.required')}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {errorText ? (
              <p role="alert" className="text-sm text-destructive">
                {errorText}
              </p>
            ) : null}

            <PendingButton type="submit" className="w-full" pending={login.isPending}>
              {t('login.submit')}
            </PendingButton>

            <div className="grid grid-cols-2 gap-2">
              {(['admin', 'user'] as const).map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setFieldValue('username', DEMO_ACCOUNTS[role].username)
                    form.setFieldValue('password', DEMO_ACCOUNTS[role].password)
                  }}
                >
                  {t(role === 'admin' ? 'login.fillAdmin' : 'login.fillUser')}
                </Button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
