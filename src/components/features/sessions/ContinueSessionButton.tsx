'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'

export function ContinueSessionButton() {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = useAppSelector((state) => state.session.isActive)
  const workoutName = useAppSelector((state) => state.session.workoutName)

  if (!isActive || pathname === '/session') return null

  return (
    <Button
      onClick={() => router.push('/session')}
      className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-40 shadow-lg"
      size="lg"
    >
      <Play className="mr-2 h-4 w-4" />
      {workoutName || 'Continue Session'}
    </Button>
  )
}
