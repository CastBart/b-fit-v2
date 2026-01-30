import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FloatingActionButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'secondary'
  className?: string
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  className,
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size="lg"
      aria-label={label}
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full p-0 shadow-lg transition-transform hover:scale-110 lg:hidden',
        className
      )}
    >
      {icon}
    </Button>
  )
}
