export interface SupersetGroupInfo {
  isInSuperset: boolean
  isFirstInSuperset: boolean
  isLastInSuperset: boolean
}

export interface SupersetStats {
  totalGroups: number
  groupSizes: Record<string, number>
  soloExercises: number
}

export interface SupersetValidation {
  valid: boolean
  errors: string[]
}
