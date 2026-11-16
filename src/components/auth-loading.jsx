import { Spinner } from './ui/spinner'

export default function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground sm:px-6">
      <Spinner className="mx-auto h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
