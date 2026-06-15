'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, History } from 'lucide-react'
import { useLatestExerciseHistory, useExerciseHistory } from '@/hooks/queries/useExerciseHistory'
import { estimateOneRepMax } from '@/lib/analytics/one-rep-max'
import type { ExerciseHistoryEntry, HistorySet } from '@/types/session'
import type { MetricType } from '@prisma/client'

// RIR is only meaningful where reps are counted; 1RM requires a real load + reps.
const RIR_METRICS = new Set<MetricType>([
  'WEIGHT_REPS',
  'COUNTER_WEIGHT_REPS',
  'REPS',
  'REPS_DURATION',
])
const ONE_RM_METRICS = new Set<MetricType>(['WEIGHT_REPS'])

// ============================================================================
// LATEST HISTORY PREVIEW (For SetLogger)
// ============================================================================

interface LatestHistoryPreviewProps {
  exerciseId: string
  metricType: MetricType
}

export function LatestHistoryPreview({ exerciseId, metricType }: LatestHistoryPreviewProps) {
  const { data: latestHistory, isLoading } = useLatestExerciseHistory(exerciseId)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!latestHistory) {
    return null
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Last session</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(latestHistory.sessionDate)}
        </span>
      </div>

      <HistorySetsTable sets={latestHistory.sets} metricType={metricType} compact />

      <HistoryMetricsSummary entry={latestHistory} metricType={metricType} />

      {latestHistory.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">{latestHistory.notes}</p>
      )}
    </div>
  )
}

// ============================================================================
// FULL HISTORY LIST (For ExerciseDrawer)
// ============================================================================

interface ExerciseHistoryListProps {
  exerciseId: string
  metricType: MetricType
  limit?: number
}

export function ExerciseHistoryList({
  exerciseId,
  metricType,
  limit = 20,
}: ExerciseHistoryListProps) {
  const { data: history, isLoading, error } = useExerciseHistory(exerciseId, limit)

  if (isLoading) {
    return <HistoryLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
        <p className="text-sm text-destructive">{error.message || 'Failed to load history'}</p>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <History className="h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 mt-4 text-sm font-semibold">No history yet</h3>
        <p className="text-sm text-muted-foreground">
          Complete workouts with this exercise to see your performance history and track progress.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <HistoryEntryCard key={entry.sessionId} entry={entry} metricType={metricType} />
      ))}
    </div>
  )
}

// ============================================================================
// HISTORY ENTRY CARD
// ============================================================================

interface HistoryEntryCardProps {
  entry: ExerciseHistoryEntry
  metricType: MetricType
}

function HistoryEntryCard({ entry, metricType }: HistoryEntryCardProps) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formatDateFull(entry.sessionDate)}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {entry.totalSets} {entry.totalSets === 1 ? 'set' : 'sets'}
        </Badge>
      </div>

      {entry.sessionName && <p className="text-xs text-muted-foreground">{entry.sessionName}</p>}

      <HistorySetsTable sets={entry.sets} metricType={metricType} compact />

      <HistoryMetricsSummary entry={entry} metricType={metricType} />

      {entry.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">{entry.notes}</p>
      )}
    </div>
  )
}

// ============================================================================
// HISTORY SETS TABLE
// ============================================================================

interface HistorySetsTableProps {
  sets: HistorySet[]
  metricType: MetricType
  compact?: boolean
}

function HistorySetsTable({ sets, metricType, compact = false }: HistorySetsTableProps) {
  const headers = getTableHeaders(metricType)

  return (
    <div className={compact ? '' : 'overflow-x-auto'}>
      <Table>
        <TableHeader>
          <TableRow className={compact ? 'text-xs' : ''}>
            <TableHead className={compact ? 'w-7 px-1 py-1 text-left' : 'w-7 px-1 text-left'}>
              #
            </TableHead>
            {headers.map((header) => (
              <TableHead
                key={header.key}
                className={compact ? 'px-1 py-1 text-center' : 'px-1 text-center'}
              >
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sets.map((set) => (
            <TableRow key={set.setNumber} className={compact ? 'text-xs' : ''}>
              <TableCell
                className={
                  compact ? 'w-7 px-1 py-1 text-left font-medium' : 'w-7 px-1 text-left font-medium'
                }
              >
                {set.setNumber}
              </TableCell>
              {headers.map((header) => (
                <TableCell
                  key={header.key}
                  className={compact ? 'px-1 py-1 text-center' : 'px-1 text-center'}
                >
                  {formatSetValue(set, header.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// HISTORY METRICS SUMMARY
// ============================================================================

interface HistoryMetricsSummaryProps {
  entry: ExerciseHistoryEntry
  metricType: MetricType
}

function HistoryMetricsSummary({ entry, metricType }: HistoryMetricsSummaryProps) {
  const showWeight = ['WEIGHT_REPS', 'WEIGHT_DISTANCE', 'WEIGHT_DURATION'].includes(metricType)
  const showVolume = metricType === 'WEIGHT_REPS'
  const showReps = ['WEIGHT_REPS', 'COUNTER_WEIGHT_REPS', 'REPS', 'REPS_DURATION'].includes(
    metricType
  )

  const hasStats =
    (showWeight && entry.maxWeight !== null) ||
    (showVolume && entry.totalVolume !== null) ||
    (showReps && entry.maxReps !== null)

  if (!hasStats) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-2">
      {showWeight && entry.maxWeight !== null && (
        <span>
          Max: <span className="font-medium text-foreground">{entry.maxWeight}kg</span>
        </span>
      )}
      {showReps && entry.maxReps !== null && (
        <span>
          Best: <span className="font-medium text-foreground">{entry.maxReps} reps</span>
        </span>
      )}
      {showVolume && entry.totalVolume !== null && (
        <span>
          Volume:{' '}
          <span className="font-medium text-foreground">
            {entry.totalVolume.toLocaleString()}kg
          </span>
        </span>
      )}
    </div>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function HistoryLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

type HeaderKey = 'weight' | 'reps' | 'duration' | 'distance' | 'counterWeight' | 'rir' | 'oneRm'

interface MetricHeader {
  key: HeaderKey
  label: string
}

function getTableHeaders(metricType: MetricType): MetricHeader[] {
  const headers = getBaseTableHeaders(metricType)
  if (RIR_METRICS.has(metricType)) headers.push({ key: 'rir', label: 'RIR' })
  if (ONE_RM_METRICS.has(metricType)) headers.push({ key: 'oneRm', label: '1RM' })
  return headers
}

function getBaseTableHeaders(metricType: MetricType): MetricHeader[] {
  switch (metricType) {
    case 'WEIGHT_REPS':
      return [
        { key: 'weight', label: 'Weight (kg)' },
        { key: 'reps', label: 'Reps' },
      ]
    case 'COUNTER_WEIGHT_REPS':
      return [
        { key: 'counterWeight', label: 'Assist (kg)' },
        { key: 'reps', label: 'Reps' },
      ]
    case 'REPS':
      return [{ key: 'reps', label: 'Reps' }]
    case 'REPS_DURATION':
      return [
        { key: 'reps', label: 'Reps' },
        { key: 'duration', label: 'Duration (s)' },
      ]
    case 'DURATION':
      return [{ key: 'duration', label: 'Duration (s)' }]
    case 'DISTANCE_DURATION':
      return [
        { key: 'distance', label: 'Distance (m)' },
        { key: 'duration', label: 'Duration (s)' },
      ]
    case 'WEIGHT_DISTANCE':
      return [
        { key: 'weight', label: 'Weight (kg)' },
        { key: 'distance', label: 'Distance (m)' },
      ]
    case 'WEIGHT_DURATION':
      return [
        { key: 'weight', label: 'Weight (kg)' },
        { key: 'duration', label: 'Duration (s)' },
      ]
    default:
      return [{ key: 'reps', label: 'Value' }]
  }
}

function formatSetValue(set: HistorySet, key: HeaderKey): string {
  if (key === 'oneRm') {
    const est = estimateOneRepMax(set.weight, set.reps, set.rir)
    return est == null ? '–' : est.toFixed(1)
  }
  const value = set[key]
  if (value === null || value === undefined) {
    return '–'
  }
  return String(value)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function formatDateFull(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
