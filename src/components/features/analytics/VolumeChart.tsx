'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatWeekLabel } from '@/lib/analytics/date-utils'
import type { VolumeDataPoint } from '@/types/analytics'

interface VolumeChartProps {
  data: VolumeDataPoint[]
  isLoading: boolean
  title?: string
}

export function VolumeChart({ data, isLoading, title = 'Volume Progression' }: VolumeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
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
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No volume data yet. Complete sessions to see your progress.
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatWeekLabel(d.week),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{item?.payload?.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Volume:{' '}
                      <span className="font-medium text-foreground">
                        {Number(item?.value ?? 0).toLocaleString()} kg
                      </span>
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
