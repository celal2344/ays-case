import { registerSchema } from '@ays/validators'
import { useForm } from '@tanstack/react-form'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { errorCodeKey } from '@/lib/error-message'
import type { AppError } from '@/lib/http-error'
import { runExclusive } from '@/lib/in-flight'

import { DEFAULT_LANDING } from '../context'
import { useRegister } from '../hooks/use-register'
import { REGISTER_CARDS } from '../panel-images'
import { selectIsAuthenticated, useAuthStore } from '../store'
import { AuthField, AUTH_BUTTON, PasswordInput, TextInput } from './auth-fields'
import { AuthLayout } from './auth-layout'

const route = getRouteApi('/register')

type Field = 'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'passwordConfirm'

/** Which field a Better Auth sign-up error is about; anything else is a general error. */
function serverField(error: AppError | null): Field | null {
  switch (error?.code) {
    case 'USERNAME_IS_ALREADY_TAKEN':
    case 'INVALID_USERNAME':
      return 'username'
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
    case 'INVALID_EMAIL':
      return 'email'
    default:
      return null
  }
}

export function RegisterPage() {
  const { t } = useTranslation()
  const { redirect } = route.useSearch()
  const register = useRegister(redirect)
  const navigate = useNavigate()
  const signedIn = useAuthStore(selectIsAuthenticated)

  // the route does not wait for the session; once it is known to be a signed-in user, leave
  useEffect(() => {
    if (signedIn) void navigate({ href: redirect ?? DEFAULT_LANDING, replace: true })
  }, [signedIn, redirect, navigate])

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
    validators: { onSubmit: registerSchema },
    onSubmit: ({ value }) =>
      runExclusive('form:register', () => register.mutateAsync(value).catch(() => undefined)),
  })

  const error = register.error
  const failedField = serverField(error)
  // a message for the field the server refused (taken username or email), a general one otherwise
  const serverMessage = (field: Field) => {
    if (failedField !== field) return null
    if (error?.code === 'USERNAME_IS_ALREADY_TAKEN') return t('register.errors.usernameTaken')
    if (
      error?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ||
      error?.code === 'USER_ALREADY_EXISTS'
    ) {
      return t('register.errors.emailTaken')
    }
    return t(`register.errors.${field}`)
  }
  const generalError = error && !failedField ? t(errorCodeKey(error)) : null

  const field = (
    name: Field,
    label: string,
    props: { autoComplete: string; type?: string; hint?: string; password?: boolean },
  ) => (
    <form.Field name={name}>
      {(f) => {
        const invalid = f.state.meta.errors.length > 0
        const message = invalid ? t(`register.errors.${name}`) : serverMessage(name)
        const Input = props.password ? PasswordInput : TextInput
        return (
          <AuthField label={label} error={message} hint={props.hint}>
            {(aria) => (
              <Input
                {...aria}
                {...(props.password ? {} : { type: props.type })}
                autoComplete={props.autoComplete}
                value={f.state.value}
                onBlur={f.handleBlur}
                onChange={(e) => {
                  if (failedField === name) register.reset()
                  f.handleChange(e.target.value)
                }}
              />
            )}
          </AuthField>
        )
      }}
    </form.Field>
  )

  return (
    <AuthLayout
      title={t('register.panelTitle')}
      text={t('register.panelText')}
      cards={REGISTER_CARDS}
      width="max-w-[460px]"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[34px] font-extrabold tracking-[-0.03em]">{t('register.title')}</h1>
        <p className="m-0 text-muted-foreground">{t('register.subtitle')}</p>
      </div>
      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', t('register.firstName'), { autoComplete: 'given-name' })}
          {field('lastName', t('register.lastName'), { autoComplete: 'family-name' })}
        </div>
        {field('username', t('register.username'), { autoComplete: 'username' })}
        {field('email', t('register.email'), { autoComplete: 'email', type: 'email' })}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {field('password', t('register.password'), {
            autoComplete: 'new-password',
            password: true,
            hint: t('register.passwordHint'),
          })}
          {field('passwordConfirm', t('register.passwordConfirm'), {
            autoComplete: 'new-password',
            password: true,
          })}
        </div>

        {generalError ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {generalError}
          </p>
        ) : null}

        <PendingButton type="submit" className={`${AUTH_BUTTON} mt-1`} pending={register.isPending}>
          {t('register.submit')}
        </PendingButton>
        <p className="m-0 text-center text-[13px] text-muted-foreground">
          {t('register.demoNote')}
        </p>
        <p className="m-0 text-center text-muted-foreground">
          {t('register.haveAccount')}{' '}
          <Link
            to="/login"
            search={{ redirect }}
            className="font-bold text-brand-text hover:underline"
          >
            {t('register.loginLink')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
