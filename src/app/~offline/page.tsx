import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are offline. Cached pages are still available.',
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          We can&apos;t reach the network right now. Any pages you&apos;ve already visited will
          still load from your device&apos;s cache, and workouts you finish while offline will sync
          as soon as you&apos;re back online.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
  )
}
