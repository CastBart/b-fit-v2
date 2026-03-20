'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import { cn } from '@/lib/utils'

// Module-level drawer stack for nested drawer support.
// Only the topmost drawer should respond to a popstate event.
const drawerStack: string[] = []

const Drawer = ({
  shouldScaleBackground = true,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const drawerId = React.useId()
  const historyPushed = React.useRef(false)
  const closedByBack = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      // Guard against duplicate registration from React effect reruns
      if (!historyPushed.current) {
        if (!drawerStack.includes(drawerId)) {
          drawerStack.push(drawerId)
        }
        history.pushState({ drawer: true }, '')
        historyPushed.current = true
        closedByBack.current = false
      }
    }
  }, [open, drawerId])

  React.useEffect(() => {
    if (!open) return

    const handlePopState = () => {
      // Only the drawer on top of the stack should close
      if (drawerStack[drawerStack.length - 1] !== drawerId) return

      // Remove from stack defensively
      const idx = drawerStack.indexOf(drawerId)
      if (idx !== -1) drawerStack.splice(idx, 1)

      closedByBack.current = true
      historyPushed.current = false
      onOpenChange?.(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, drawerId, onOpenChange])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      const idx = drawerStack.indexOf(drawerId)
      if (idx !== -1) drawerStack.splice(idx, 1)
    }
  }, [drawerId])

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !closedByBack.current) {
        // Normal close (swipe, overlay tap, programmatic)
        const idx = drawerStack.indexOf(drawerId)
        if (idx !== -1) drawerStack.splice(idx, 1)

        // Pop the history entry we pushed
        if (historyPushed.current) {
          historyPushed.current = false
          history.back()
        }
      }
      // Reset for next open cycle
      if (!newOpen) {
        closedByBack.current = false
      }
      onOpenChange?.(newOpen)
    },
    [drawerId, onOpenChange]
  )

  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  )
}
Drawer.displayName = 'Drawer'

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
        className
      )}
      {...props}
    >
      <DrawerPrimitive.Handle className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
