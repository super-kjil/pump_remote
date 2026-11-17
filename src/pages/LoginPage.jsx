import { useState } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '../components/ui/field'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/auth-context'

function getLoginErrorMessage(error) {
  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Try again later.'
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}

function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    if (isLoggingIn) return

    setLoginError('')
    setIsLoggingIn(true)

    try {
      await signIn(email.trim(), password)
    } catch (error) {
      console.error('Sign-in failed:', error)
      setLoginError(getLoginErrorMessage(error))
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <section className="flex items-center p-8 sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-7 flex flex-col gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                ESP32 Control
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Monitor your device and control each relay in real time.
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoggingIn}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                </Field>

                {loginError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Sign-in failed</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Signing in…' : 'Sign in'}
                  {!isLoggingIn ? <ArrowRightIcon data-icon="inline-end" /> : null}
                </Button>
              </FieldGroup>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
