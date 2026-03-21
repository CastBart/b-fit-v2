'use client'

import { createContext, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ActiveSessionGuardContextValue {
  guardedStart: (callback: () => void) => void
}

export const ActiveSessionGuardContext = createContext<ActiveSessionGuardContextValue>({
  guardedStart: (cb) => cb(),
})

export function ActiveSessionGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isActive = useAppSelector((state) => state.session.isActive)
  const [dialogOpen, setDialogOpen] = useState(false)
  const pendingCallbackRef = useRef<(() => void) | null>(null)

  const guardedStart = useCallback(
    (callback: () => void) => {
      if (!isActive) {
        callback()
        return
      }
      pendingCallbackRef.current = callback
      setDialogOpen(true)
    },
    [isActive]
  )

  const handleContinue = () => {
    setDialogOpen(false)
    pendingCallbackRef.current = null
    router.push('/session')
  }

  const handleStartNew = () => {
    setDialogOpen(false)
    pendingCallbackRef.current?.()
    pendingCallbackRef.current = null
  }

  return (
    <ActiveSessionGuardContext.Provider value={{ guardedStart }}>
      {children}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Active Session In Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You already have an active session. Would you like to continue it or start a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleContinue}>Continue Active Session</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNew}>Start New Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ActiveSessionGuardContext.Provider>
  )
}
