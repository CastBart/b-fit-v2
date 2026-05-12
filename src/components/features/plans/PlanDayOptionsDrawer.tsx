'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Play, SkipForward, Pencil } from 'lucide-react'
import { useSkipPlanDay, allocateSkipDayClientId } from '@/hooks/mutations/usePlanMutations'
import type { ActivePlanDashboard } from '@/types/plan'

interface PlanDayOptionsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  planDayId: string
  dayNumber: number
  sessionName: string
  exercises: ActivePlanDashboard['days'][number]['exercises']
  canStart: boolean
  canSkip: boolean
  onStartSession: () => void
  onClose: () => void
}

export function PlanDayOptionsDrawer({
  open,
  onOpenChange,
  planId,
  planDayId,
  dayNumber,
  canStart,
  canSkip,
  onStartSession,
  onClose,
}: PlanDayOptionsDrawerProps) {
  const router = useRouter()
  const { data: authSession } = useSession()
  const isClient = authSession?.user?.role === 'CLIENT'
  const skipMutation = useSkipPlanDay()

  const handleSkip = () => {
    skipMutation.mutate({
      planId,
      planDayId,
      clientId: allocateSkipDayClientId(),
    })
    onClose()
  }

  const handleEditPlan = () => {
    router.push(`/plans/builder?id=${planId}&day=${dayNumber}`)
    onClose()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer-no-height justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Day Options</DrawerTitle>
          <DrawerDescription className="hidden">Options for this plan day</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-3">
          {canStart && (
            <Button className="w-full" size="lg" onClick={onStartSession}>
              <Play className="mr-2 h-5 w-5" />
              Start Workout
            </Button>
          )}

          {canSkip && (
            <Button variant="outline" className="w-full" size="lg" onClick={handleSkip}>
              <SkipForward className="mr-2 h-5 w-5" />
              Skip Day
            </Button>
          )}

          {!isClient && (canStart || canSkip) && <Separator />}

          {!isClient && (
            <Button variant="outline" className="w-full" size="lg" onClick={handleEditPlan}>
              <Pencil className="mr-2 h-5 w-5" />
              Edit Plan
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
