/**
 * Superset color palette and style resolution.
 *
 * Centralizes the group color cycling + letter-label logic that is used to
 * render superset indicators (vertical bar + lettered badge) across the plan
 * detail page and the active plan day drawer.
 */

export interface SupersetColors {
  bg: string
  text: string
  border: string
  line: string
}

export interface SupersetStyle {
  label: string
  colors: SupersetColors
}

/**
 * Ordered color palette. Groups cycle through this list by order of first
 * appearance within a day's exercises.
 */
export const groupColors: SupersetColors[] = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', line: 'bg-blue-500' },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    line: 'bg-purple-500',
  },
  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', line: 'bg-green-500' },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    line: 'bg-orange-500',
  },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', line: 'bg-pink-500' },
]

/**
 * Build a `getSupersetStyle` resolver for a single day's exercises.
 *
 * Assigns letter labels (A, B, C…) to each unique groupId in order of first
 * appearance and maps each to a color from {@link groupColors}. Returns a
 * function that resolves a groupId to its `{ label, colors }`, or `null` when
 * the exercise is not part of a superset.
 */
export function createSupersetStyleResolver(
  exercises: Array<{ groupId?: string | null }>
): (groupId: string | null | undefined) => SupersetStyle | null {
  const groupIdToLabel = new Map<string, string>()
  const uniqueGroupIds = new Set<string>()

  exercises.forEach((ex) => {
    if (ex.groupId) uniqueGroupIds.add(ex.groupId)
  })

  let labelIndex = 0
  uniqueGroupIds.forEach((groupId) => {
    groupIdToLabel.set(groupId, String.fromCharCode(65 + labelIndex))
    labelIndex++
  })

  const orderedGroupIds = Array.from(groupIdToLabel.keys())

  return (groupId: string | null | undefined): SupersetStyle | null => {
    if (!groupId) return null
    const label = groupIdToLabel.get(groupId)
    if (!label) return null
    const colorIndex = orderedGroupIds.indexOf(groupId)
    const colors = groupColors[colorIndex % groupColors.length]
    if (!colors) return null
    return { label, colors }
  }
}
