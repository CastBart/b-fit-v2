/**
 * Set Settings Drawer Component
 *
 * Drawer for managing set configuration:
 * - Add/Remove sets
 * - Undo last set
 */

'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Settings, Plus, Minus, Undo2 } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { addSet, removeLastSet, undoLastCompletedSet } from '@/store/slices/sessionSlice'
import { toast } from 'sonner'

interface SetSettingsDrawerProps {
  instanceId: string
  currentSetCount: number
  hasCompletedSets: boolean
  disabled?: boolean
}

export function SetSettingsDrawer({
  instanceId,
  currentSetCount,
  hasCompletedSets,
  disabled,
}: SetSettingsDrawerProps) {
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)

  const handleAddSet = () => {
    dispatch(addSet({ instanceId }))
    toast.success('Set added')
  }

  const handleRemoveSet = () => {
    if (currentSetCount === 0) return
    dispatch(removeLastSet({ instanceId }))
    toast.success('Set removed')
  }

  const handleUndoLastSet = () => {
    dispatch(undoLastCompletedSet({ instanceId }))
    toast.success('Set undone')
    setOpen(false)
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="max-w-[600px] mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-2xl">Set Settings</DrawerTitle>
          <DrawerDescription className="hidden">Manage sets for this exercise</DrawerDescription>
          <Separator className="mt-2" />
        </DrawerHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Number of Sets with +/- buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRemoveSet}
              disabled={disabled || currentSetCount === 0}
              className="h-12 w-12 rounded-full"
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center min-w-[120px]">
              <div className="text-5xl font-bold tabular-nums">{currentSetCount}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSetCount === 1 ? 'Set' : 'Sets'}
              </p>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={handleAddSet}
              disabled={disabled}
              className="h-12 w-12 rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Undo Last Set Button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleUndoLastSet}
            disabled={disabled || !hasCompletedSets}
            className="w-full"
          >
            <Undo2 className="mr-2 h-5 w-5" />
            Undo Last Set
          </Button>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
