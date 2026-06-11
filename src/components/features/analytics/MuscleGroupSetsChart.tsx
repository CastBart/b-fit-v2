'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MUSCLE_GROUP_COLORS } from '@/components/features/analytics/muscle-group-colors'
import { MuscleGroupLabels } from '@/types/exercise'
import { formatSetCount } from '@/lib/analytics/muscle-set-counts'
import type { MuscleGroupSetCountPoint } from '@/types/analytics'
import type { MuscleGroup } from '@prisma/client'

interface MuscleGroupSetsChartProps {
  data: MuscleGroupSetCountPoint[]
  isLoading: boolean
}

export function MuscleGroupSetsChart({ data, isLoading }: MuscleGroupSetsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sets by Muscle Group</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sets by Muscle Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No data yet. Complete sessions to see your set distribution.
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: MuscleGroupLabels[d.muscleGroup as MuscleGroup] ?? d.muscleGroup,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sets by Muscle Group</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              width={90}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]?.payload as (typeof chartData)[0] | undefined
                if (!item) return null
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Sets:{' '}
                      <span className="font-medium text-foreground">
                        {formatSetCount(item.sets)}
                      </span>
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="sets" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.muscleGroup}
                  fill={MUSCLE_GROUP_COLORS[entry.muscleGroup] ?? '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
