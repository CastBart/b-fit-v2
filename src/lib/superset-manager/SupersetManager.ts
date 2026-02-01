import type { SupersetGroupInfo, SupersetStats, SupersetValidation } from './types'

/**
 * SupersetManager - Centralized superset logic for workout exercises
 *
 * This class provides a stateless, array-based approach to managing supersets.
 * All methods are pure functions that operate on passed arrays and return new arrays.
 *
 * Generic constraint: T must have an optional groupId property (string | null | undefined)
 */
export class SupersetManager<T extends { groupId?: string | null }> {
  // ============================================================================
  // Decision Methods (for UI button visibility)
  // ============================================================================

  /**
   * Check if an exercise can be superseted with the next exercise
   */
  canSupersetWithNext(exercises: T[], index: number): boolean {
    // Guard: out of bounds
    if (index < 0 || index >= exercises.length) return false

    // Guard: no next exercise
    if (index >= exercises.length - 1) return false

    const current = exercises[index]
    const next = exercises[index + 1]

    if (!current || !next) return false

    // Can't superset if already in same group
    if (current.groupId && next.groupId && current.groupId === next.groupId) {
      return false
    }

    return true
  }

  /**
   * Check if an exercise can be superseted with the previous exercise
   */
  canSupersetWithPrev(exercises: T[], index: number): boolean {
    // Guard: out of bounds
    if (index < 0 || index >= exercises.length) return false

    // Guard: no previous exercise
    if (index <= 0) return false

    const current = exercises[index]
    const prev = exercises[index - 1]

    if (!current || !prev) return false

    // Can't superset if already in same group
    if (current.groupId && prev.groupId && current.groupId === prev.groupId) {
      return false
    }

    return true
  }

  /**
   * Check if an exercise can be removed from superset with next exercise
   */
  canRemoveSupersetWithNext(exercises: T[], index: number): boolean {
    // Guard: out of bounds
    if (index < 0 || index >= exercises.length) return false

    // Guard: no next exercise
    if (index >= exercises.length - 1) return false

    const current = exercises[index]
    const next = exercises[index + 1]

    if (!current || !next) return false

    // Can only remove if both are in the same group
    return !!(current.groupId && next.groupId && current.groupId === next.groupId)
  }

  /**
   * Check if an exercise can be removed from superset with previous exercise
   */
  canRemoveSupersetWithPrev(exercises: T[], index: number): boolean {
    // Guard: out of bounds
    if (index < 0 || index >= exercises.length) return false

    // Guard: no previous exercise
    if (index <= 0) return false

    const current = exercises[index]
    const prev = exercises[index - 1]

    if (!current || !prev) return false

    // Can only remove if both are in the same group
    return !!(current.groupId && prev.groupId && current.groupId === prev.groupId)
  }

  /**
   * Check if an exercise is in any superset
   */
  isInSuperset(exercise: T): boolean {
    return !!exercise.groupId
  }

  // ============================================================================
  // Action Methods (for mutations - return new arrays)
  // ============================================================================

  /**
   * Superset an exercise with the next exercise
   * Handles 4 scenarios:
   * 1. Both in different groups → merge groups (reassign all to one groupId)
   * 2. Only current has group → add next to group
   * 3. Only next has group → add current to group
   * 4. Neither has group → create new group
   */
  supersetWithNext(exercises: T[], index: number): T[] {
    // Guard: can't superset
    if (!this.canSupersetWithNext(exercises, index)) return exercises

    const current = exercises[index]
    const next = exercises[index + 1]

    if (!current || !next) return exercises

    const currentGroupId = current.groupId
    const nextGroupId = next.groupId

    // Scenario 1: Both in different groups → merge groups
    if (currentGroupId && nextGroupId && currentGroupId !== nextGroupId) {
      return exercises.map((ex) =>
        ex.groupId === nextGroupId ? { ...ex, groupId: currentGroupId } : ex
      )
    }

    // Scenario 2: Only current has group → add next to group
    if (currentGroupId && !nextGroupId) {
      return exercises.map((ex, i) => (i === index + 1 ? { ...ex, groupId: currentGroupId } : ex))
    }

    // Scenario 3: Only next has group → add current to group
    if (!currentGroupId && nextGroupId) {
      return exercises.map((ex, i) => (i === index ? { ...ex, groupId: nextGroupId } : ex))
    }

    // Scenario 4: Neither has group → create new group
    const newGroupId = crypto.randomUUID()
    return exercises.map((ex, i) =>
      i === index || i === index + 1 ? { ...ex, groupId: newGroupId } : ex
    )
  }

  /**
   * Superset an exercise with the previous exercise
   */
  supersetWithPrev(exercises: T[], index: number): T[] {
    // Guard: can't superset
    if (!this.canSupersetWithPrev(exercises, index)) return exercises

    const current = exercises[index]
    const prev = exercises[index - 1]

    if (!current || !prev) return exercises

    const currentGroupId = current.groupId
    const prevGroupId = prev.groupId

    // Scenario 1: Both in different groups → merge groups
    if (currentGroupId && prevGroupId && currentGroupId !== prevGroupId) {
      return exercises.map((ex) =>
        ex.groupId === currentGroupId ? { ...ex, groupId: prevGroupId } : ex
      )
    }

    // Scenario 2: Only current has group → add prev to group
    if (currentGroupId && !prevGroupId) {
      return exercises.map((ex, i) => (i === index - 1 ? { ...ex, groupId: currentGroupId } : ex))
    }

    // Scenario 3: Only prev has group → add current to group
    if (!currentGroupId && prevGroupId) {
      return exercises.map((ex, i) => (i === index ? { ...ex, groupId: prevGroupId } : ex))
    }

    // Scenario 4: Neither has group → create new group
    const newGroupId = crypto.randomUUID()
    return exercises.map((ex, i) =>
      i === index || i === index - 1 ? { ...ex, groupId: newGroupId } : ex
    )
  }

  /**
   * Remove superset connection between current and next exercise
   * Splits the group at the specified point
   */
  removeSupersetWithNext(exercises: T[], index: number): T[] {
    // Guard: can't remove
    if (!this.canRemoveSupersetWithNext(exercises, index)) return exercises

    const current = exercises[index]
    if (!current?.groupId) return exercises

    const targetGroupId = current.groupId

    // Find all exercises in this group with their indices
    const groupIndices = exercises
      .map((ex, i) => ({ ex, i }))
      .filter(({ ex }) => ex.groupId === targetGroupId)
      .map(({ i }) => i)

    // Find split point (current exercise position in group)
    const splitPoint = groupIndices.indexOf(index)
    if (splitPoint === -1) return exercises

    // Split indices into left and right groups
    const leftIndices = groupIndices.slice(0, splitPoint + 1)
    const rightIndices = groupIndices.slice(splitPoint + 1)

    // If either side has < 2 exercises, dissolve that side
    const leftGroupId = leftIndices.length >= 2 ? targetGroupId : null
    const rightGroupId = rightIndices.length >= 2 ? crypto.randomUUID() : null

    return exercises.map((ex, i) => {
      if (leftIndices.includes(i)) {
        return { ...ex, groupId: leftGroupId }
      }
      if (rightIndices.includes(i)) {
        return { ...ex, groupId: rightGroupId }
      }
      return ex
    })
  }

  /**
   * Remove superset connection between current and previous exercise
   * Splits the group at the specified point
   */
  removeSupersetWithPrev(exercises: T[], index: number): T[] {
    // Guard: can't remove
    if (!this.canRemoveSupersetWithPrev(exercises, index)) return exercises

    const current = exercises[index]
    if (!current?.groupId) return exercises

    const targetGroupId = current.groupId

    // Find all exercises in this group with their indices
    const groupIndices = exercises
      .map((ex, i) => ({ ex, i }))
      .filter(({ ex }) => ex.groupId === targetGroupId)
      .map(({ i }) => i)

    // Find split point (previous exercise position in group)
    const splitPoint = groupIndices.indexOf(index - 1)
    if (splitPoint === -1) return exercises

    // Split indices into left and right groups
    const leftIndices = groupIndices.slice(0, splitPoint + 1)
    const rightIndices = groupIndices.slice(splitPoint + 1)

    // If either side has < 2 exercises, dissolve that side
    const leftGroupId = leftIndices.length >= 2 ? targetGroupId : null
    const rightGroupId = rightIndices.length >= 2 ? crypto.randomUUID() : null

    return exercises.map((ex, i) => {
      if (leftIndices.includes(i)) {
        return { ...ex, groupId: leftGroupId }
      }
      if (rightIndices.includes(i)) {
        return { ...ex, groupId: rightGroupId }
      }
      return ex
    })
  }

  /**
   * Remove an exercise from its superset group completely
   * Dissolves the group if it becomes too small (< 2 exercises)
   */
  removeFromSuperset(exercises: T[], index: number): T[] {
    // Guard: out of bounds
    if (index < 0 || index >= exercises.length) return exercises

    const exercise = exercises[index]
    if (!exercise?.groupId) return exercises

    const targetGroupId = exercise.groupId

    // Count remaining exercises in group (excluding current)
    const remainingInGroup = exercises.filter(
      (ex, i) => i !== index && ex.groupId === targetGroupId
    )

    // If < 2 remaining, dissolve the entire group
    if (remainingInGroup.length < 2) {
      return exercises.map((ex) => (ex.groupId === targetGroupId ? { ...ex, groupId: null } : ex))
    }

    // Otherwise, just remove current exercise from group
    return exercises.map((ex, i) => (i === index ? { ...ex, groupId: null } : ex))
  }

  /**
   * Reassign superset groups after drag-and-drop reordering
   * Logic:
   * 1. Check if moved exercise is still adjacent to original group members
   * 2. Remove from group if not adjacent
   * 3. Join new group if moved between two exercises with same groupId
   * 4. Handle group dissolution if size < 2
   */
  reassignAfterReorder(exercises: T[], movedFromIndex: number, movedToIndex: number): T[] {
    // Guard: invalid indices
    if (
      movedFromIndex < 0 ||
      movedToIndex < 0 ||
      movedFromIndex >= exercises.length ||
      movedToIndex >= exercises.length
    ) {
      return exercises
    }

    // Guard: no actual movement
    if (movedFromIndex === movedToIndex) return exercises

    const movedExercise = exercises[movedToIndex]
    if (!movedExercise) return exercises

    const originalGroupId = movedExercise.groupId

    // If not in a group, check if should join a new group
    if (!originalGroupId) {
      return this.checkJoinNewGroup(exercises, movedToIndex)
    }

    // Check if still adjacent to at least one member of original group
    const prev = movedToIndex > 0 ? exercises[movedToIndex - 1] : null
    const next = movedToIndex < exercises.length - 1 ? exercises[movedToIndex + 1] : null

    const stillAdjacentToGroup =
      prev?.groupId === originalGroupId || next?.groupId === originalGroupId

    if (stillAdjacentToGroup) {
      // Still in group, no changes needed
      return exercises
    }

    // Not adjacent anymore, remove from original group
    let updated = exercises.map((ex, i) => (i === movedToIndex ? { ...ex, groupId: null } : ex))

    // Check if original group needs dissolution
    const remainingInGroup = updated.filter((ex) => ex.groupId === originalGroupId)
    if (remainingInGroup.length < 2) {
      updated = updated.map((ex) =>
        ex.groupId === originalGroupId ? { ...ex, groupId: null } : ex
      )
    }

    // Check if should join a new group at new position
    return this.checkJoinNewGroup(updated, movedToIndex)
  }

  /**
   * Helper: Check if an exercise at given index should join a group
   * (when positioned between two exercises with the same groupId)
   */
  private checkJoinNewGroup(exercises: T[], index: number): T[] {
    const prev = index > 0 ? exercises[index - 1] : null
    const next = index < exercises.length - 1 ? exercises[index + 1] : null

    // Join group if between two exercises in the same group
    if (prev?.groupId && next?.groupId && prev.groupId === next.groupId) {
      return exercises.map((ex, i) => (i === index ? { ...ex, groupId: prev.groupId } : ex))
    }

    return exercises
  }

  // ============================================================================
  // Utility Methods (for debugging/validation)
  // ============================================================================

  /**
   * Validate superset integrity
   * Checks for:
   * - Single-member groups (should be dissolved)
   * - Non-contiguous groups (members not adjacent)
   */
  validateSupersets(exercises: T[]): SupersetValidation {
    const errors: string[] = []

    // Group exercises by groupId
    const groups = new Map<string, number[]>()
    exercises.forEach((ex, i) => {
      if (ex.groupId) {
        if (!groups.has(ex.groupId)) {
          groups.set(ex.groupId, [])
        }
        groups.get(ex.groupId)!.push(i)
      }
    })

    // Check each group
    groups.forEach((indices, groupId) => {
      // Check for single-member groups
      if (indices.length < 2) {
        errors.push(`Group ${groupId} has only ${indices.length} member(s), should be dissolved`)
      }

      // Check for non-contiguous groups
      const sortedIndices = [...indices].sort((a, b) => a - b)
      for (let i = 1; i < sortedIndices.length; i++) {
        const prev = sortedIndices[i - 1]!
        const curr = sortedIndices[i]!
        if (curr - prev !== 1) {
          errors.push(
            `Group ${groupId} is non-contiguous (gap between indices ${prev} and ${curr})`
          )
          break
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get all exercises in the same superset group as the given index
   */
  getSupersetGroup(exercises: T[], index: number): T[] {
    const exercise = exercises[index]
    if (!exercise?.groupId) return []

    return exercises.filter((ex) => ex.groupId === exercise.groupId)
  }

  /**
   * Get statistics about supersets in the exercise array
   */
  getSupersetStats(exercises: T[]): SupersetStats {
    const groupSizes: Record<string, number> = {}
    let soloExercises = 0

    exercises.forEach((ex) => {
      if (ex.groupId) {
        groupSizes[ex.groupId] = (groupSizes[ex.groupId] || 0) + 1
      } else {
        soloExercises++
      }
    })

    return {
      totalGroups: Object.keys(groupSizes).length,
      groupSizes,
      soloExercises,
    }
  }

  /**
   * Get detailed superset information for an exercise at given index
   * Useful for rendering visual indicators
   */
  getSupersetInfo(exercises: T[], index: number): SupersetGroupInfo {
    const exercise = exercises[index]
    if (!exercise?.groupId) {
      return { isInSuperset: false, isFirstInSuperset: false, isLastInSuperset: false }
    }

    const groupId = exercise.groupId
    const prev = index > 0 ? exercises[index - 1] : null
    const next = index < exercises.length - 1 ? exercises[index + 1] : null

    const isFirstInSuperset = !prev || prev.groupId !== groupId
    const isLastInSuperset = !next || next.groupId !== groupId

    return {
      isInSuperset: true,
      isFirstInSuperset,
      isLastInSuperset,
    }
  }
}
