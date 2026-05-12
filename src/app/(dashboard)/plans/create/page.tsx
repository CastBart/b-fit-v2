/**
 * Create Plan Page
 *
 * Multi-step form for creating a new training plan:
 * 1. Plan name & description
 * 2. Days per week (1-7)
 * 3. Duration (unlimited or 1-52 weeks)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreatePlan, allocatePlanTempId } from '@/hooks/mutations/usePlanMutations'
import { cn } from '@/lib/utils'

const DURATION_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 36, 52]

export default function CreatePlanPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const createPlan = useCreatePlan()

  // Step state
  const [step, setStep] = useState(1)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3)
  const [durationWeeks, setDurationWeeks] = useState<number>(0)

  const canProceedStep1 = name.trim().length > 0
  const canProceedStep2 = daysPerWeek >= 1 && daysPerWeek <= 7

  const handleCreate = () => {
    if (!session?.user?.id) return
    // Allocate the tempId at the UI boundary so we can navigate to the
    // builder URL immediately. The temp-id redirect hook swaps the URL
    // to the real id when the server responds.
    const tempId = allocatePlanTempId()
    createPlan.mutate({
      input: {
        name: name.trim(),
        description: description.trim() || undefined,
        daysPerWeek,
        durationWeeks,
      },
      tempId,
      userId: session.user.id,
    })
    router.push(`/plans/builder?id=${tempId}`)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1)
              } else {
                router.push('/plans')
              }
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Create Plan</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Step {step} of 3</p>
        {/* Step indicator */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Name & Description */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>
              Give your training plan a name and optional description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Push Pull Legs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., 3-day split focusing on hypertrophy"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Days Per Week */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Days Per Week</CardTitle>
            <CardDescription>How many training days per week does this plan have?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  onClick={() => setDaysPerWeek(day)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all',
                    daysPerWeek === day
                      ? 'border-primary bg-primary text-primary-foreground shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  <span className="text-2xl font-bold">{day}</span>
                  <span className="text-xs mt-1">{day === 1 ? 'day' : 'days'}</span>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="w-full">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Duration */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Duration</CardTitle>
            <CardDescription>
              How long will this plan run? Choose unlimited or a set number of weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Unlimited option */}
            <button
              onClick={() => setDurationWeeks(0)}
              className={cn(
                'w-full rounded-xl border-2 p-4 text-left transition-all',
                durationWeeks === 0
                  ? 'border-primary bg-primary text-primary-foreground shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              <div className="text-lg font-bold">Unlimited</div>
              <div
                className={cn(
                  'text-sm mt-1',
                  durationWeeks === 0 ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
              >
                Run this plan indefinitely
              </div>
            </button>

            {/* Week options */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Or choose a duration:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {DURATION_OPTIONS.filter((w) => w > 0).map((weeks) => (
                  <button
                    key={weeks}
                    onClick={() => setDurationWeeks(weeks)}
                    className={cn(
                      'rounded-lg border p-2 text-center transition-all text-sm',
                      durationWeeks === weeks
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                  >
                    <div className="font-semibold">{weeks}</div>
                    <div
                      className={cn(
                        'text-[10px]',
                        durationWeeks === weeks
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {weeks === 1 ? 'week' : 'wks'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full">
              <Check className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
