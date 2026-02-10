'use client'

import { useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { usePlans } from '@/hooks/queries/usePlans'
import { useAssignPlan } from '@/hooks/mutations/useClientMutations'

interface AssignPlanDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
}

export function AssignPlanDrawer({
  open,
  onOpenChange,
  clientId,
  clientName,
}: AssignPlanDrawerProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = usePlans({ search: search || undefined })
  const assignMutation = useAssignPlan()

  const handleAssign = async (planId: string) => {
    await assignMutation.mutateAsync({ planId, clientId })
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Assign Plan</DrawerTitle>
          <DrawerDescription>
            Choose a plan to assign to {clientName}. A copy will be created for them.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="mt-1 h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {!isLoading && data?.plans.length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CalendarDays className="mb-2 h-8 w-8" />
                <p className="text-sm">No plans found</p>
              </div>
            )}

            {!isLoading &&
              data?.plans.map((plan) => (
                <Card
                  key={plan.id}
                  className="cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => handleAssign(plan.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{plan.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {plan.daysPerWeek} days/week &middot; {plan.durationWeeks} weeks
                        </p>
                      </div>
                      {assignMutation.isPending && (
                        <span className="text-xs text-muted-foreground">Assigning...</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
