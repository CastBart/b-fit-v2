'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreatePlanForClient } from '@/hooks/mutations/usePlanMutations'
import { cn } from '@/lib/utils'

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const DURATION_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24]

interface CreatePlanForClientPageProps {
  params: Promise<{ id: string }>
}

export default function CreatePlanForClientPage({ params }: CreatePlanForClientPageProps) {
  const { id: clientId } = use(params)
  const router = useRouter()
  const createPlan = useCreatePlanForClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [durationWeeks, setDurationWeeks] = useState(0)

  const handleSubmit = () => {
    if (!name.trim()) return

    createPlan.mutate(
      {
        clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        daysPerWeek,
        durationWeeks,
      },
      {
        onSuccess: (data) => {
          if (data) {
            router.push(`/plans/${data.id}/builder`)
          }
        },
      }
    )
  }

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <Button variant="ghost" className="mb-6" onClick={() => router.push(`/clients/${clientId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Client
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Plan for Client</CardTitle>
          <CardDescription>
            Set up a new training plan. You&apos;ll configure the exercises next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push/Pull/Legs"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-desc">Description (optional)</Label>
            <Input
              id="plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Days per Week</Label>
            <div className="flex gap-2">
              {DAYS_PER_WEEK_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysPerWeek(d)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                    daysPerWeek === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {DURATION_OPTIONS.map((weeks) => (
                <button
                  key={weeks}
                  onClick={() => setDurationWeeks(weeks)}
                  className={cn(
                    'rounded-lg border p-1.5 text-center transition-all text-xs',
                    durationWeeks === weeks
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  <div className="font-semibold">{weeks === 0 ? '\u221E' : weeks}</div>
                  <div
                    className={cn(
                      'text-[9px] leading-tight',
                      durationWeeks === weeks
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {weeks === 0 ? '' : weeks === 1 ? 'wk' : 'wks'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/clients/${clientId}`)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!name.trim() || createPlan.isPending}
            >
              {createPlan.isPending ? 'Creating...' : 'Create & Edit Days'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
