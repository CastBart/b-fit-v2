// ============================================================================
// DATE RANGE
// ============================================================================

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'all'

export type DateRange = {
  start: Date
  end: Date
}

// ============================================================================
// VOLUME
// ============================================================================

export type VolumeDataPoint = {
  week: string // "YYYY-WNN" format
  volume: number // total kg
}

export type MuscleGroupDistribution = {
  muscleGroup: string
  volume: number
  percentage: number
}

// ============================================================================
// FREQUENCY & CONSISTENCY
// ============================================================================

export type FrequencyStats = {
  sessionsPerWeek: number
  totalSessions: number
  weeks: number
  consistencyScore: number // percentage of weeks with >=1 session
}

// ============================================================================
// ADHERENCE
// ============================================================================

export type AdherenceStats = {
  adherenceRate: number // percentage
  completedDays: number
  totalDays: number
}

// ============================================================================
// PERSONAL RECORDS
// ============================================================================

export type PRType = 'WEIGHT' | 'DURATION' | 'DISTANCE' | 'REPS' | 'VOLUME'

export type RecentPR = {
  exerciseId: string
  exerciseName: string
  prType: PRType
  value: number
  previousValue: number | null
  date: Date
}

export type PRSummary = {
  totalPRs: number
  recentPRs: RecentPR[]
}

// ============================================================================
// ANALYTICS OVERVIEW (aggregated response)
// ============================================================================

export type AnalyticsOverview = {
  // Stats (from dashboard)
  totalWorkouts: number
  sessionsCompleted: number
  totalVolume: number
  personalRecords: number

  // Charts
  volumeProgression: VolumeDataPoint[]
  muscleGroupDistribution: MuscleGroupDistribution[]

  // Frequency
  frequency: FrequencyStats

  // Adherence (null if no active plan)
  adherence: AdherenceStats | null

  // PRs
  prSummary: PRSummary
}

// ============================================================================
// EXERCISE COMPARISON
// ============================================================================

export type ExerciseComparisonData = {
  exerciseId: string
  exerciseName: string
  dataPoints: VolumeDataPoint[]
}

// ============================================================================
// ORGANISATION ANALYTICS
// ============================================================================

export type PTBreakdown = {
  ptId: string
  ptName: string
  clientCount: number
  totalVolume: number
  totalSessions: number
}

export type OrgAnalyticsOverview = {
  totalPTs: number
  totalClients: number
  totalSessions: number
  totalVolume: number
  averageAdherence: number
  ptBreakdown: PTBreakdown[]
}
