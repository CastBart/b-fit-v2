/**
 * NotesEditorDrawer — focused free-text notes editor for the session.
 *
 * Notes need a real keyboard, so this is the deliberate exception to the
 * "no native keyboard in session" rule. Editing in a dedicated drawer keeps the
 * keyboard off the exercise carousel / floating rest-timer. Vaul's
 * repositionInputs (on by default) lifts the focused textarea above the
 * keyboard; the scrollable body + bottom padding keep it clear.
 *
 * Commits on close (drawer close / swipe / overlay / Done).
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface NotesEditorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  value: string
  placeholder?: string
  onCommit: (text: string) => void
}

export function NotesEditorDrawer({
  open,
  onOpenChange,
  title,
  value,
  placeholder,
  onCommit,
}: NotesEditorDrawerProps) {
  const [text, setText] = useState(value)
  const textRef = useRef(text)
  textRef.current = text

  // Seed the local draft each time the drawer opens.
  useEffect(() => {
    if (open) setText(value)
  }, [open, value])

  const handleOpenChange = (next: boolean) => {
    if (!next) onCommit(textRef.current)
    onOpenChange(next)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">Edit notes</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          <Textarea
            autoFocus
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>

        <DrawerFooter>
          <Button onClick={() => handleOpenChange(false)} className="w-full">
            Done
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
