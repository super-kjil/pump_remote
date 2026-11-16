import { Cpu, SignOut } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ModeToggle } from './mode-toggle'
import { useAuth } from '../contexts/auth-context'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLogoutError('')
    setIsLoggingOut(true)

    try {
      await signOut()
    } catch {
      setLogoutError('Could not sign out. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
          to="/dashboard"
        >
          <Cpu aria-hidden="true" data-icon="inline-start" />
          <span className="truncate">ESP32 Relay Control</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Badge className="hidden max-w-56 truncate sm:inline-flex" variant="outline">
            {user.email || user.uid}
          </Badge>
          <ModeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            onClick={handleLogout}
          >
            <SignOut data-icon="inline-start" />
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </nav>
      {logoutError ? (
        <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Sign-out failed</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </header>
  )
}
