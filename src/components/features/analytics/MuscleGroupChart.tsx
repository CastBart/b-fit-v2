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
import type { MuscleGroupDistribution } from '@/types/analytics'

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  CHEST: '#ef4444',
  UPPER_BACK: '#3b82f6',
  LATS: '#2563eb',
  LOWER_BACK: '#1d4ed8',
  TRAPS: '#60a5fa',
  FRONT_DELTS: '#f97316',
  SIDE_DELTS: '#fb923c',
  REAR_DELTS: '#ea580c',
  BICEPS: '#8b5cf6',
  TRICEPS: '#a855f7',
  FOREARMS: '#7c3aed',
  QUADS: '#22c55e',
  HAMSTRINGS: '#14b8a6',
  GLUTES: '#06b6d4',
  CALVES: '#64748b',
  CORE: '#eab308',
  ABDUCTORS: '#84cc16',
  ADDUCTORS: '#65a30d',
  FULL_BODY: '#ec4899',
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  UPPER_BACK: 'Upper Back',
  LATS: 'Lats',
  LOWER_BACK: 'Lower Back',
  TRAPS: 'Traps',
  FRONT_DELTS: 'Front Delts',
  SIDE_DELTS: 'Side Delts',
  REAR_DELTS: 'Rear Delts',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  ABDUCTORS: 'Abductors',
  ADDUCTORS: 'Adductors',
  FULL_BODY: 'Full Body',
}

interface MuscleGroupChartProps {
  data: MuscleGroupDistribution[]
  isLoading: boolean
}

export function MuscleGroupChart({ data, isLoading }: MuscleGroupChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Muscle Group Distribution</CardTitle>
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
          <CardTitle className="text-base">Muscle Group Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No data yet. Complete sessions to see your muscle group distribution.
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: MUSCLE_GROUP_LABELS[d.muscleGroup] ?? d.muscleGroup,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Muscle Group Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
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
                      Volume:{' '}
                      <span className="font-medium text-foreground">
                        {item.volume.toLocaleString()} kg
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Share: <span className="font-medium text-foreground">{item.percentage}%</span>
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
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
