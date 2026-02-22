'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatWeekLabel } from '@/lib/analytics/date-utils'
import type { ExerciseComparisonData } from '@/types/analytics'

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6']

interface ComparisonChartProps {
  data: ExerciseComparisonData[]
  isLoading: boolean
}

export function ComparisonChart({ data, isLoading }: ComparisonChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
            Select exercises to compare their volume progression.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Merge all data points into a unified time axis
  const weekSet = new Set<string>()
  for (const exercise of data) {
    for (const point of exercise.dataPoints) {
      weekSet.add(point.week)
    }
  }

  const sortedWeeks = Array.from(weekSet).sort()

  // Build chart data: each row has { week, label, [exerciseName]: volume }
  const chartData = sortedWeeks.map((week) => {
    const row: Record<string, string | number> = {
      week,
      label: formatWeekLabel(week),
    }

    for (const exercise of data) {
      const point = exercise.dataPoints.find((p) => p.week === week)
      row[exercise.exerciseName] = point?.volume ?? 0
    }

    return row
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm space-y-1">
                    <p className="text-sm font-medium">{label}</p>
                    {payload.map((entry) => (
                      <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}:{' '}
                        <span className="font-medium">
                          {Number(entry.value ?? 0).toLocaleString()} kg
                        </span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Legend />
            {data.map((exercise, index) => (
              <Line
                key={exercise.exerciseId}
                type="monotone"
                dataKey={exercise.exerciseName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
