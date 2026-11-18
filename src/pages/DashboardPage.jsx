import { useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Toggle } from '../components/ui/toggle'
import { db } from '../firebase'
import { useAuth } from '../contexts/auth-context'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Menu,
  Pencil,
  Power,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'

const RELAYS = [
  { id: 'r1', name: 'Relay 1', pin: 'GPIO 12' },
  { id: 'r2', name: 'Relay 2', pin: 'GPIO 14' },
  { id: 'r3', name: 'Relay 3', pin: 'GPIO 27' },
  { id: 'r4', name: 'Relay 4', pin: 'GPIO 26' },
]

const RELAY_NAME_MAX_LENGTH = 40

const DEVICE_EMOJIS = [
  { emoji: '💡', label: 'Light' },
  { emoji: '🌀', label: 'Fan' },
  { emoji: '💧', label: 'Pump' },
  { emoji: '🚿', label: 'Water' },
  { emoji: '🔌', label: 'Plug' },
  { emoji: '❄️', label: 'Air conditioner' },
  { emoji: '🔥', label: 'Heater' },
  { emoji: '📺', label: 'TV' },
  { emoji: '🔊', label: 'Speaker' },
  { emoji: '🚪', label: 'Door' },
  { emoji: '🔔', label: 'Alarm' },
  { emoji: '📷', label: 'Camera' },
  { emoji: '🌱', label: 'Garden' },
]

function isRelayOn(value) {
  return value === true || value === 1 || value === 'true'
}

function relayDisplayName(relay, relayNames) {
  const custom =
    typeof relayNames?.[relay.id] === 'string' ? relayNames[relay.id].trim() : ''
  return custom || relay.name
}

function relayEmoji(relayId, relayNames) {
  const value = relayNames?.emoji?.[relayId]
  if (typeof value !== 'string') return ''
  return DEVICE_EMOJIS.some((item) => item.emoji === value) ? value : ''
}

function getSavedRelayOrder(userId) {
  try {
    const savedOrder = window.localStorage.getItem(`relay-order:${userId}`)
    if (!savedOrder) return RELAYS

    const relayIds = JSON.parse(savedOrder)
    const validRelayIds = new Set(RELAYS.map((relay) => relay.id))
    if (
      !Array.isArray(relayIds) ||
      relayIds.length !== RELAYS.length ||
      new Set(relayIds).size !== RELAYS.length ||
      !relayIds.every((relayId) => validRelayIds.has(relayId))
    ) {
      console.error('Saved relay order is invalid; using the default order.')
      return RELAYS
    }

    return relayIds.map((relayId) =>
      RELAYS.find((relay) => relay.id === relayId)
    )
  } catch (error) {
    console.error('Could not read the saved relay order:', error)
    return RELAYS
  }
}

function getSavedHiddenRelayIds(userId) {
  try {
    const savedIds = window.localStorage.getItem(`hidden-relays:${userId}`)
    if (!savedIds) return []

    const relayIds = JSON.parse(savedIds)
    const validRelayIds = new Set(RELAYS.map((relay) => relay.id))
    if (
      !Array.isArray(relayIds) ||
      new Set(relayIds).size !== relayIds.length ||
      !relayIds.every((relayId) => validRelayIds.has(relayId))
    ) {
      console.error('Saved hidden relays are invalid; showing all relays.')
      return []
    }

    return relayIds
  } catch (error) {
    console.error('Could not read the saved hidden relays:', error)
    return []
  }
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
        <div className="flex items-center gap-2">
          <Skeleton aria-hidden="true" className="size-8" />
          <Skeleton aria-hidden="true" className="h-6 w-36" />
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton aria-hidden="true" className="h-6 w-24" />
          <Skeleton aria-hidden="true" className="h-4 w-56 max-w-full" />
        </div>

        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
          {RELAYS.map((relay) => (
            <Card key={relay.id} className="min-h-48 gap-0 py-0">
              <CardHeader className="flex-1 justify-between gap-6 px-5 pt-5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                  <Skeleton className="size-12 rounded-xl" />
                </div>
              </CardHeader>
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
  const [relayOrder, setRelayOrder] = useState(() => getSavedRelayOrder(user.uid))
  const [hiddenRelayIds, setHiddenRelayIds] = useState(() =>
    getSavedHiddenRelayIds(user.uid)
  )
  const [hiddenRelaysOpen, setHiddenRelaysOpen] = useState(false)
  const [draggedRelayId, setDraggedRelayId] = useState(null)
  const [dragOverRelayId, setDragOverRelayId] = useState(null)
  const [relayNames, setRelayNames] = useState({})
  const [editingRelayId, setEditingRelayId] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [savingNameId, setSavingNameId] = useState(null)
  const [emojiPickerRelayId, setEmojiPickerRelayId] = useState(null)
  const [savingEmojiId, setSavingEmojiId] = useState(null)
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
  const [statusOpen, setStatusOpen] = useState(false)
  const dashboardError = actionError || Object.values(listenerErrors).find(Boolean)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `relay-order:${user.uid}`,
        JSON.stringify(relayOrder.map((relay) => relay.id))
      )
    } catch (error) {
      console.error('Could not save the relay order:', error)
    }
  }, [relayOrder, user.uid])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `hidden-relays:${user.uid}`,
        JSON.stringify(hiddenRelayIds)
      )
    } catch (error) {
      console.error('Could not save the hidden relays:', error)
    }
  }, [hiddenRelayIds, user.uid])

  useEffect(() => {
    const connectionRef = ref(db, '.info/connected')
    const relayRef = ref(db, 'relays')
    const namesRef = ref(db, 'config/relayNames')
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

    const unsubscribeNames = onValue(
      namesRef,
      (snapshot) => {
        setRelayNames(snapshot.val() || {})
        setListenerErrors((current) => ({ ...current, names: '' }))
      },
      (error) => {
        console.error('Relay name listener failed:', error)
        setListenerErrors((current) => ({
          ...current,
          names:
            error.code === 'PERMISSION_DENIED'
              ? 'Database access was denied. Check your Realtime Database rules and signed-in account.'
              : 'Could not load relay names from the database.',
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
      unsubscribeNames()
      unsubscribeStatus()
    }
  }, [])

  if (!hasLoadedRelays || !hasLoadedStatus) {
    return <DashboardSkeleton />
  }

  const visibleRelays = relayOrder.filter(
    (relay) => !hiddenRelayIds.includes(relay.id)
  )
  const hiddenRelays = relayOrder.filter((relay) =>
    hiddenRelayIds.includes(relay.id)
  )

  const startRename = (relay) => {
    setActionError('')
    setEditingRelayId(relay.id)
    setNameDraft(relayDisplayName(relay, relayNames))
  }

  const cancelRename = () => {
    setEditingRelayId(null)
    setNameDraft('')
  }

  const hideRelay = (relayId) => {
    setHiddenRelayIds((current) =>
      current.includes(relayId) ? current : [...current, relayId]
    )
    setEmojiPickerRelayId((current) => (current === relayId ? null : current))
    if (editingRelayId === relayId) cancelRename()
  }

  const restoreRelay = (relayId) => {
    setHiddenRelayIds((current) => current.filter((id) => id !== relayId))
  }

  const saveRelayName = async (relay) => {
    if (!isFirebaseConnected || savingNameId) return

    const trimmed = nameDraft.trim().slice(0, RELAY_NAME_MAX_LENGTH)
    setActionError('')
    setSavingNameId(relay.id)

    try {
      await set(ref(db, `config/relayNames/${relay.id}`), trimmed || null)
      setEditingRelayId(null)
      setNameDraft('')
    } catch (error) {
      console.error(`Failed to rename ${relay.id}:`, error)
      setActionError(
        error.code === 'PERMISSION_DENIED'
          ? 'Renaming was denied. Allow writes to config/relayNames in your Realtime Database rules.'
          : 'Could not save the relay name. Check the connection and try again.'
      )
    } finally {
      setSavingNameId(null)
    }
  }

  const saveRelayEmoji = async (relay, emoji) => {
    if (!isFirebaseConnected || savingEmojiId) return

    setActionError('')
    setSavingEmojiId(relay.id)

    try {
      await set(ref(db, `config/relayNames/emoji/${relay.id}`), emoji || null)
      setEmojiPickerRelayId(null)
    } catch (error) {
      console.error(`Failed to set emoji for ${relay.id}:`, error)
      setActionError(
        error.code === 'PERMISSION_DENIED'
          ? 'Saving the emoji was denied. Allow writes to config/relayNames in your Realtime Database rules.'
          : 'Could not save the device emoji. Check the connection and try again.'
      )
    } finally {
      setSavingEmojiId(null)
    }
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

  const moveRelay = (relayId, offset) => {
    setRelayOrder((current) => {
      const visibleRelays = current.filter(
        (relay) => !hiddenRelayIds.includes(relay.id)
      )
      const currentIndex = visibleRelays.findIndex(
        (relay) => relay.id === relayId
      )
      const nextIndex = currentIndex + offset
      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= visibleRelays.length
      ) {
        return current
      }

      const next = [...visibleRelays]
      const [movedRelay] = next.splice(currentIndex, 1)
      next.splice(nextIndex, 0, movedRelay)
      let visibleIndex = 0
      return current.map((relay) =>
        hiddenRelayIds.includes(relay.id) ? relay : next[visibleIndex++]
      )
    })
  }

  const handleRelayDrop = (event, targetRelayId) => {
    event.preventDefault()
    const sourceRelayId = event.dataTransfer.getData('text/plain')
    if (sourceRelayId && sourceRelayId !== targetRelayId) {
      setRelayOrder((current) => {
        const visibleRelays = current.filter(
          (relay) => !hiddenRelayIds.includes(relay.id)
        )
        const sourceIndex = visibleRelays.findIndex(
          (relay) => relay.id === sourceRelayId
        )
        const targetIndex = visibleRelays.findIndex(
          (relay) => relay.id === targetRelayId
        )
        if (sourceIndex < 0 || targetIndex < 0) return current

        const next = [...visibleRelays]
        const [movedRelay] = next.splice(sourceIndex, 1)
        next.splice(targetIndex, 0, movedRelay)
        let visibleIndex = 0
        return current.map((relay) =>
          hiddenRelayIds.includes(relay.id) ? relay : next[visibleIndex++]
        )
      })
    }
    setDraggedRelayId(null)
    setDragOverRelayId(null)
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={statusOpen ? 'Hide device status' : 'Show device status'}
            aria-expanded={statusOpen}
            aria-controls="device-status"
            onClick={() => setStatusOpen((open) => !open)}
          >
            {statusOpen ? <X /> : <Menu />}
          </Button>
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
        </div>
      </header>

      {dashboardError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard issue</AlertTitle>
          <AlertDescription>{dashboardError}</AlertDescription>
        </Alert>
      ) : null}

      {statusOpen ? (
      <section
        id="device-status"
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
      ) : null}

      <section aria-labelledby="relays-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="relays-heading" className="text-xl font-semibold tracking-tight">
            Relays
          </h2>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email || user.uid}
          </p>
        </div>

        {visibleRelays.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
          {visibleRelays.map((relay, relayIndex) => {
            const isOn = isRelayOn(relayState[relay.id])
            const isPending = pendingRelays.includes(relay.id)
            const displayName = relayDisplayName(relay, relayNames)
            const emoji = relayEmoji(relay.id, relayNames)
            const isEditing = editingRelayId === relay.id
            const isSavingName = savingNameId === relay.id
            const isPickingEmoji = emojiPickerRelayId === relay.id
            const isSavingEmoji = savingEmojiId === relay.id

            return (
              <Card
                key={relay.id}
                className={cn(
                  'min-h-48 gap-0 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  isOn && 'ring-lime-500/30',
                  draggedRelayId === relay.id && 'scale-[0.98] opacity-50',
                  dragOverRelayId === relay.id &&
                    draggedRelayId !== relay.id &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDragOverRelayId(relay.id)}
                onDrop={(event) => handleRelayDrop(event, relay.id)}
              >
                <CardHeader className="gap-0 px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    {isEditing ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-1"
                        onSubmit={(event) => {
                          event.preventDefault()
                          saveRelayName(relay)
                        }}
                      >
                        <Input
                          value={nameDraft}
                          maxLength={RELAY_NAME_MAX_LENGTH}
                          autoFocus
                          aria-label={`Name for ${relay.pin}`}
                          disabled={isSavingName || !isFirebaseConnected}
                          onChange={(event) => setNameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              cancelRename()
                            }
                          }}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Save relay name"
                          disabled={isSavingName || !isFirebaseConnected}
                        >
                          <Check />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Cancel rename"
                          disabled={isSavingName}
                          onClick={cancelRename}
                        >
                          <X />
                        </Button>
                      </form>
                    ) : (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <CardTitle className="truncate text-base font-semibold">
                          {displayName}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Rename ${displayName}`}
                          disabled={!isFirebaseConnected}
                          onClick={() => startRename(relay)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    )}
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        className={cn(
                          'gap-1.5 px-2.5 py-1',
                          isOn
                            ? 'border-lime-500/30 bg-lime-500/10 text-lime-600 dark:text-lime-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'size-1.5 rounded-full',
                            isOn ? 'bg-lime-500' : 'bg-red-500'
                          )}
                        />
                        {isOn ? 'On' : 'Off'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hide ${displayName}`}
                        title="Hide card"
                        onClick={() => hideRelay(relay.id)}
                      >
                        <EyeOff />
                      </Button>
                      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          draggable
                          aria-label={`Drag to reorder ${displayName}`}
                          title="Drag to reorder"
                          className="cursor-grab rounded-md active:cursor-grabbing"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', relay.id)
                            setDraggedRelayId(relay.id)
                          }}
                          onDragEnd={() => {
                            setDraggedRelayId(null)
                            setDragOverRelayId(null)
                          }}
                        >
                          <GripVertical />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ${displayName} up`}
                          disabled={relayIndex === 0}
                          onClick={() => moveRelay(relay.id, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ${displayName} down`}
                          disabled={relayIndex === visibleRelays.length - 1}
                          onClick={() => moveRelay(relay.id, 1)}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-center gap-4 px-5 pt-3 pb-5">
                  {isPickingEmoji ? (
                    <div className="grid grid-cols-7 gap-1" role="listbox" aria-label={`Emoji for ${displayName}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="No emoji"
                        disabled={isSavingEmoji}
                        onClick={() => saveRelayEmoji(relay, '')}
                      >
                        <X />
                      </Button>
                      {DEVICE_EMOJIS.map((item) => (
                        <Button
                          key={item.label}
                          type="button"
                          variant={emoji === item.emoji ? 'secondary' : 'ghost'}
                          size="icon-sm"
                          role="option"
                          aria-selected={emoji === item.emoji}
                          aria-label={item.label}
                          title={item.label}
                          disabled={isSavingEmoji || !isFirebaseConnected}
                          onClick={() => saveRelayEmoji(relay, item.emoji)}
                          className="text-base"
                        >
                          {item.emoji}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <Button
                        variant="outline"
                        // size="icon-lg"
                        aria-label={
                          emoji
                            ? `Change emoji for ${displayName}`
                            : `Choose emoji for ${displayName}`
                        }
                        aria-expanded={isPickingEmoji}
                        disabled={!isFirebaseConnected || isSavingEmoji}
                        onClick={() =>
                          setEmojiPickerRelayId((current) =>
                            current === relay.id ? null : relay.id
                          )
                        }
                        className="size-14 rounded-xl text-4xl"
                      >
                        {emoji || '＋'}
                      </Button>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                          Output pin
                        </span>
                        <CardTitle className="truncate text-xl font-semibold tracking-tight">
                          {relay.pin}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <Toggle
                        id={`toggle-${relay.id}`}
                        variant="ghost"
                        size="lg"
                        pressed={isOn}
                        disabled={!isFirebaseConnected || isPending}
                        onPressedChange={(pressed) =>
                          handleRelayToggle(relay.id, pressed)
                        }
                        aria-label={`${displayName} power`}
                        className={cn(
                          'size-12 min-w-12 rounded-xl border transition-all duration-200',
                          isOn
                            ? 'border-lime-500/30 bg-lime-500 text-white hover:bg-lime-600 data-[state=on]:bg-lime-500 data-[state=on]:text-white'
                            : 'border-border bg-muted text-muted-foreground hover:bg-muted/80 data-[state=off]:bg-muted',
                          'disabled:pointer-events-none disabled:opacity-50'
                        )}
                      >
                        <Power />
                      </Toggle>
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        {isOn ? 'Turn off' : 'Turn on'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </div>
        ) : (
          <Card className="border-dashed py-2">
            <CardHeader className="items-center gap-2 py-6 text-center">
              <CardTitle className="text-base">All relay cards are hidden</CardTitle>
              <CardDescription>
                Open hidden relays below to show a card again.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {hiddenRelays.length > 0 ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              aria-expanded={hiddenRelaysOpen}
              onClick={() => setHiddenRelaysOpen((open) => !open)}
            >
              {hiddenRelaysOpen ? (
                <EyeOff data-icon="inline-start" />
              ) : (
                <Eye data-icon="inline-start" />
              )}
              {hiddenRelaysOpen ? 'Hide hidden relays' : 'Show hidden relays'}
              <Badge variant="secondary">{hiddenRelays.length}</Badge>
            </Button>
            {hiddenRelaysOpen ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {hiddenRelays.map((relay) => (
                  <Card
                    key={relay.id}
                    className="flex-row items-center justify-between gap-3 px-4 py-3"
                  >
                    <CardHeader className="min-w-0 flex-1 gap-1 p-0">
                      <CardTitle className="truncate text-sm">
                        {relayDisplayName(relay, relayNames)}
                      </CardTitle>
                      <CardDescription>{relay.pin}</CardDescription>
                    </CardHeader>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => restoreRelay(relay.id)}
                    >
                      <Eye data-icon="inline-start" />
                      Show
                    </Button>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default DashboardPage
