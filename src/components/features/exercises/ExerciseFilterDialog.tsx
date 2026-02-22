'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface ExerciseFilterDialogProps {
  title: string
  options: FilterOption[]
  selected: string[]
  onSelect: (values: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseFilterDialog({
  title,
  options,
  selected,
  onSelect,
  open,
  onOpenChange,
}: ExerciseFilterDialogProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onSelect(selected.filter((v) => v !== value))
    } else {
      onSelect([...selected, value])
    }
  }

  const useGrid = options.every((o) => o.icon !== undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={useGrid ? 'max-w-lg' : 'max-w-sm'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className={useGrid ? 'max-h-[70vh]' : 'max-h-72'}>
          {useGrid ? (
            <div className="grid grid-cols-2 gap-2 pr-1">
              {options.map(({ value, label, icon }) => {
                const isSelected = selected.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggle(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-card-foreground hover:bg-accent'
                    )}
                  >
                    <div className="flex h-16 w-[52px] items-center justify-center">{icon}</div>
                    <span className="text-center text-xs font-medium leading-tight">{label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-1 pr-4">
              {options.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.includes(value)}
                    onCheckedChange={() => toggle(value)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect([])}
            disabled={selected.length === 0}
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
