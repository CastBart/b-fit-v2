'use client'

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Pencil, Copy, Trash2, FileDown } from 'lucide-react'

interface DayBuilderOptionsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayNumber: number
  canDuplicate: boolean
  canDelete: boolean
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  onCopyFromWorkout?: () => void
}

export function DayBuilderOptionsDrawer({
  open,
  onOpenChange,
  dayNumber,
  canDuplicate,
  canDelete,
  onRename,
  onDuplicate,
  onDelete,
  onCopyFromWorkout,
}: DayBuilderOptionsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer-no-height justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Day {dayNumber} Options</DrawerTitle>
          <DrawerDescription className="hidden">Options for this plan day</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-3">
          {onCopyFromWorkout && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                onOpenChange(false)
                onCopyFromWorkout()
              }}
            >
              <FileDown className="mr-2 h-5 w-5" />
              Copy from Workout
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false)
              onRename()
            }}
          >
            <Pencil className="mr-2 h-5 w-5" />
            Rename
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false)
              onDuplicate()
            }}
            disabled={!canDuplicate}
          >
            <Copy className="mr-2 h-5 w-5" />
            Duplicate
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false)
              onDelete()
            }}
            disabled={!canDelete}
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Delete
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
