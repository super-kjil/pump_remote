import { useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { Toggle } from '../components/ui/toggle'
import { db } from '../firebase'
import { useAuth } from '../contexts/auth-context'
import { Power } from 'lucide-react'
import { cn } from '../lib/utils';


const RELAYS = [
  { id: 'r1', name: 'Relay 1', pin: 'GPIO 12' },
  { id: 'r2', name: 'Relay 2', pin: 'GPIO 14' },
  { id: 'r3', name: 'Relay 3', pin: 'GPIO 27' },
  { id: 'r4', name: 'Relay 4', pin: 'GPIO 26' },
]

function isRelayOn(value) {
  return value === true || value === 1 || value === 'true'
}

function formatUptime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function StatusCard({ title, children, description }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl">{children}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="-mt-3 text-xs text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <p role="status" className="sr-only">
        Loading dashboard data…
      </p>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full max-w-lg flex-col gap-3">
          <Skeleton aria-hidden="true" className="h-4 w-32" />
          <Skeleton aria-hidden="true" className="h-9 w-64 max-w-full" />
          <Skeleton aria-hidden="true" className="h-4 w-full max-w-sm" />
        </div>
        <Skeleton aria-hidden="true" className="h-6 w-36" />
      </header>

      <section
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-28" />
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton aria-hidden="true" className="h-6 w-24" />
          <Skeleton aria-hidden="true" className="h-4 w-56 max-w-full" />
        </div>

        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
          {RELAYS.map((relay) => (
            <Card key={relay.id}>
              <CardHeader className="gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-px w-full" />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-44 max-w-full" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const [relayState, setRelayState] = useState({})
  const [espStatus, setEspStatus] = useState({
    online: false,
    ip: '—',
    uptime: 0,
    rssi: '—',
  })
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(null)
  const [pendingRelays, setPendingRelays] = useState([])
  const [hasLoadedRelays, setHasLoadedRelays] = useState(false)
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false)
  const [listenerErrors, setListenerErrors] = useState({})
  const [actionError, setActionError] = useState('')
  const dashboardError = actionError || Object.values(listenerErrors).find(Boolean)

  useEffect(() => {
    const connectionRef = ref(db, '.info/connected')
    const relayRef = ref(db, 'relays')
    const statusRef = ref(db, 'status/esp32')

    const unsubscribeConnection = onValue(
      connectionRef,
      (snapshot) => {
        setIsFirebaseConnected(snapshot.val() === true)
        setListenerErrors((current) => ({ ...current, connection: '' }))
      },
      (error) => {
        console.error('Firebase connection listener failed:', error)
        setIsFirebaseConnected(false)
        setListenerErrors((current) => ({
          ...current,
          connection: 'Unable to monitor the Firebase Realtime Database connection.',
        }))
      }
    )

    const unsubscribeRelays = onValue(
      relayRef,
      (snapshot) => {
        setRelayState(snapshot.val() || {})
        setHasLoadedRelays(true)
        setListenerErrors((current) => ({ ...current, relays: '' }))
      },
      (error) => {
        console.error('Relay listener failed:', error)
        setHasLoadedRelays(true)
        setListenerErrors((current) => ({
          ...current,
          relays:
            error.code === 'PERMISSION_DENIED'
              ? 'Database access was denied. Check your Realtime Database rules and signed-in account.'
              : 'Could not load relay states from the database.',
        }))
      }
    )

    const unsubscribeStatus = onValue(
      statusRef,
      (snapshot) => {
        const value = snapshot.val() || {}
        setEspStatus({
          online: isRelayOn(value.online),
          ip: value.ip || '—',
          uptime: value.uptime ?? 0,
          rssi: value.rssi ?? '—',
        })
        setHasLoadedStatus(true)
      },
      (error) => {
        console.error('ESP32 status listener failed:', error)
        setHasLoadedStatus(true)
        setListenerErrors((current) => ({
          ...current,
          status:
            error.code === 'PERMISSION_DENIED'
              ? 'Database access was denied. Check your Realtime Database rules and signed-in account.'
              : 'Could not load ESP32 status from the database.',
        }))
      }
    )

    return () => {
      unsubscribeConnection()
      unsubscribeRelays()
      unsubscribeStatus()
    }
  }, [])

  if (!hasLoadedRelays || !hasLoadedStatus) {
    return <DashboardSkeleton />
  }

  const handleRelayToggle = async (relayId, enabled) => {
    if (!isFirebaseConnected || pendingRelays.includes(relayId)) return

    const previousValue = isRelayOn(relayState[relayId])
    setActionError('')
    setPendingRelays((current) => [...current, relayId])

    try {
      await set(ref(db, `relays/${relayId}`), enabled)
    } catch (error) {
      console.error(`Failed to update ${relayId}:`, error)
      setRelayState((current) => ({ ...current, [relayId]: previousValue }))
      setActionError(
        error.code === 'PERMISSION_DENIED'
          ? 'Relay control was denied. Check your Realtime Database rules and signed-in account.'
          : 'Could not update the relay. Check the connection and try again.'
      )
    } finally {
      setPendingRelays((current) => current.filter((id) => id !== relayId))
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Device control
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Relay dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor your ESP32 and control its connected relays.
          </p>
        </div>
        <Badge
          variant={isFirebaseConnected ? 'secondary' : 'outline'}
          aria-live="polite"
        >
          {/* <span
            aria-hidden="true"
            className={`size-2 rounded-full ${
              isFirebaseConnected ? 'bg-primary' : 'bg-muted-foreground'
            }`}
          /> */}
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${isFirebaseConnected ? 'bg-lime-500' : 'bg-red-500'
              }`}
          />
          {isFirebaseConnected === null
            ? 'Connecting…'
            : isFirebaseConnected
              ? 'Database connected'
              : 'Database offline'}
        </Badge>
      </header>

      {dashboardError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard issue</AlertTitle>
          <AlertDescription>{dashboardError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="ESP32 status"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatusCard title="ESP32 status">
          {/* <Badge variant={espStatus.online ? 'secondary' : 'outline'}>
            {espStatus.online ? 'Online' : 'Offline'}
          </Badge> */}
          <Badge
            variant={espStatus.online ? 'secondary' : 'outline'}
          >
            <span
              aria-hidden="true"
              className={`mr-1.5 size-1.5 rounded-full ${espStatus.online ? 'bg-lime-500' : 'bg-red-500'
                }`}
            />
            {espStatus.online ? 'Online' : 'Offline'}
          </Badge>
        </StatusCard>
        <StatusCard title="IP address">{espStatus.ip}</StatusCard>
        <StatusCard title="Uptime">{formatUptime(espStatus.uptime)}</StatusCard>
        <StatusCard title="Wi-Fi signal">
          {espStatus.rssi === '—' ? '—' : `${espStatus.rssi} dBm`}
        </StatusCard>
      </section>

      <section aria-labelledby="relays-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="relays-heading" className="text-xl font-semibold tracking-tight">
            Relays
          </h2>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email || user.uid}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {RELAYS.map((relay) => {
            const isOn = isRelayOn(relayState[relay.id])
            const isPending = pendingRelays.includes(relay.id)

            return (
              <Card key={relay.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardDescription>{relay.name}</CardDescription>
                    <Badge className={
                      isOn ? 'border-lime-500/30 bg-lime-500/10 text-lime-600 dark:text-lime-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                    }
                    >
                      {isOn ? 'On' : 'Off'}
                    </Badge>
                  </div>


                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-lg">{relay.pin}</CardTitle>
                    {/* <Toggle
                      id={`toggle-${relay.id}`}
                      variant="outline"
                      size="sm"
                      pressed={isOn}
                      disabled={!isFirebaseConnected || isPending}
                      onPressedChange={(pressed) =>
                        handleRelayToggle(relay.id, pressed)
                      }
                      aria-label={`${relay.name} power`}
                    >
                      {isOn ? <Power /> : <Power />}
                    </Toggle> */}
                    <Toggle
                      id={`toggle-${relay.id}`}
                      variant="ghost"
                      size="sm"
                      pressed={isOn}
                      disabled={!isFirebaseConnected || isPending}
                      onPressedChange={(pressed) => handleRelayToggle(relay.id, pressed)}
                      aria-label={`${relay.name} power`}
                      className={cn(
                        'h-9 w-9 rounded-lg border transition-all duration-200',
                        isOn
                          ? 'border-green-500/30 bg-green-500 text-white hover:bg-green-600 data-[state=on]:bg-green-500 data-[state=on]:text-white'
                          : 'border-muted bg-muted text-muted-foreground hover:bg-muted/80 data-[state=off]:bg-muted',
                        'disabled:pointer-events-none disabled:opacity-50'
                      )}
                    >
                      <Power className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOn && 'scale-110'
                      )} />
                    </Toggle>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default DashboardPage
