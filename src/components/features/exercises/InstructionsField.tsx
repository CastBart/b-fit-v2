/**
 * Instructions Field Component
 *
 * Reusable component for managing exercise instructions.
 * Supports adding, removing, and reordering instruction steps.
 */

'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InstructionsFieldProps {
  value: string[]
  onChange: (instructions: string[]) => void
  disabled?: boolean
  error?: string
}

export function InstructionsField({ value, onChange, disabled, error }: InstructionsFieldProps) {
  const handleAdd = () => {
    onChange([...value, ''])
  }

  const handleRemove = (index: number) => {
    const newInstructions = value.filter((_, i) => i !== index)
    onChange(newInstructions)
  }

  const handleChange = (index: number, newValue: string) => {
    const newInstructions = [...value]
    newInstructions[index] = newValue
    onChange(newInstructions)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newInstructions = [...value]
    const current = newInstructions[index]
    const prev = newInstructions[index - 1]
    if (current !== undefined && prev !== undefined) {
      newInstructions[index - 1] = current
      newInstructions[index] = prev
      onChange(newInstructions)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index === value.length - 1) return
    const newInstructions = [...value]
    const current = newInstructions[index]
    const next = newInstructions[index + 1]
    if (current !== undefined && next !== undefined) {
      newInstructions[index] = next
      newInstructions[index + 1] = current
      onChange(newInstructions)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className={error ? 'text-destructive' : ''}>Instructions</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={disabled}>
          <Plus className="mr-1 h-3 w-3" />
          Add Step
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No instructions added yet. Click &quot;Add Step&quot; to add instructions.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((instruction, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={disabled || index === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <GripVertical className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={disabled || index === value.length - 1}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              </div>

              <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                {index + 1}.
              </span>

              <Input
                value={instruction}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={`Step ${index + 1}`}
                disabled={disabled}
                className="flex-1"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
