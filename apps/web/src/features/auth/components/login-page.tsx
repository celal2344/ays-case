import { useForm } from '@tanstack/react-form'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { errorCodeKey } from '@/lib/error-message'
import { runExclusive } from '@/lib/in-flight'

import { DEFAULT_LANDING } from '../context'
import { DEMO_ACCOUNTS } from '../demo-accounts'
import { useLogin } from '../hooks/use-login'
import { LOGIN_CARDS } from '../panel-images'
import { loginFormSchema } from '../schemas'
import { selectIsAuthenticated, useAuthStore } from '../store'
import { AuthField, AUTH_BUTTON, PasswordInput, TextInput } from './auth-fields'
import { AuthLayout } from './auth-layout'

const route = getRouteApi('/login')

/** A small, clearly labelled aid: it only fills the form with a public demo account. */
function DemoBox({ onFill }: { onFill: (role: keyof typeof DEMO_ACCOUNTS) => void }) {
  const { t } = useTranslation()
  return (
    <aside className="inline-flex items-center gap-2.5 rounded-xl border border-dashed border-[#d6d3d1] bg-[#fafaf9] px-3.5 py-2.5 text-xs dark:border-white/20 dark:bg-white/5">
      <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-stone-600 uppercase dark:bg-white/10 dark:text-stone-300">
        {t('login.demoTag')}
      </span>
      <span className="text-stone-600 dark:text-stone-300">{t('login.demoQuick')}</span>
      {(['admin', 'user'] as const).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onFill(role)}
          className="h-[30px] rounded-lg border bg-card px-2.5 text-xs font-semibold text-stone-700 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-stone-200"
        >
          {t(role === 'admin' ? 'login.demoAdmin' : 'login.demoUser')}
        </button>
      ))}
    </aside>
  )
}

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
    defaultValues: { identifier: '', password: '' },
    validators: { onSubmit: loginFormSchema },
    onSubmit: ({ value }) =>
      runExclusive('form:login', () => login.mutateAsync(value).catch(() => undefined)),
  })

  const error = login.error
  const errorText = error
    ? error.kind === 'validation'
      ? error.message
      : t(errorCodeKey(error))
    : null

  return (
    <AuthLayout
      title={t('login.panelTitle')}
      text={t('login.panelText')}
      cards={LOGIN_CARDS}
      width="max-w-[420px]"
      footer={
        <DemoBox
          onFill={(role) => {
            form.setFieldValue('identifier', DEMO_ACCOUNTS[role].username)
            form.setFieldValue('password', DEMO_ACCOUNTS[role].password)
          }}
        />
      }
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[34px] font-extrabold tracking-[-0.03em]">{t('login.title')}</h1>
        <p className="m-0 text-muted-foreground">{t('login.subtitle')}</p>
      </div>
      <form
        className="mt-7 flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field name="identifier">
          {(field) => (
            <AuthField
              label={t('login.identifier')}
              error={field.state.meta.errors.length > 0 ? t('login.required') : null}
            >
              {(aria) => (
                <TextInput
                  {...aria}
                  autoComplete="username"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </AuthField>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <AuthField
              label={t('login.password')}
              error={field.state.meta.errors.length > 0 ? t('login.required') : null}
            >
              {(aria) => (
                <PasswordInput
                  {...aria}
                  autoComplete="current-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </AuthField>
          )}
        </form.Field>

        {errorText ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {errorText}
          </p>
        ) : null}

        <PendingButton type="submit" className={AUTH_BUTTON} pending={login.isPending}>
          {t('login.submit')}
        </PendingButton>
        <p className="m-0 text-center text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link
            to="/register"
            search={{ redirect }}
            className="font-bold text-brand-text hover:underline"
          >
            {t('login.registerLink')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
