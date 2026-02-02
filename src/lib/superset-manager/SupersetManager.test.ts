/**
 * SupersetManager Unit Tests
 *
 * Tests for the core superset management logic
 */

import { SupersetManager } from './SupersetManager'

interface TestExercise {
  id: string
  name: string
  groupId?: string | null
}

describe('SupersetManager', () => {
  let manager: SupersetManager<TestExercise>

  beforeEach(() => {
    manager = new SupersetManager<TestExercise>()
  })

  describe('canSupersetWithNext', () => {
    it('returns true when next exists and not in same group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      expect(manager.canSupersetWithNext(exercises, 0)).toBe(true)
    })

    it('returns false when at last position', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      expect(manager.canSupersetWithNext(exercises, 1)).toBe(false)
    })

    it('returns false when already in same group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
      ]
      expect(manager.canSupersetWithNext(exercises, 0)).toBe(false)
    })

    it('returns false for out of bounds index', () => {
      const exercises = [{ id: '1', name: 'Exercise 1' }]
      expect(manager.canSupersetWithNext(exercises, -1)).toBe(false)
      expect(manager.canSupersetWithNext(exercises, 10)).toBe(false)
    })
  })

  describe('canSupersetWithPrev', () => {
    it('returns true when prev exists and not in same group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      expect(manager.canSupersetWithPrev(exercises, 1)).toBe(true)
    })

    it('returns false when at first position', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      expect(manager.canSupersetWithPrev(exercises, 0)).toBe(false)
    })

    it('returns false when already in same group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
      ]
      expect(manager.canSupersetWithPrev(exercises, 1)).toBe(false)
    })
  })

  describe('supersetWithNext', () => {
    it('creates new group when neither has groupId', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      const result = manager.supersetWithNext(exercises, 0)

      expect(result[0]?.groupId).toBeTruthy()
      expect(result[1]?.groupId).toBeTruthy()
      expect(result[0]?.groupId).toBe(result[1]?.groupId)
    })

    it('adds to existing group when one has groupId', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2' },
      ]
      const result = manager.supersetWithNext(exercises, 0)

      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBe('group1')
    })

    it('merges groups when both have different groupIds', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group2' },
        { id: '3', name: 'Exercise 3', groupId: 'group2' },
      ]
      const result = manager.supersetWithNext(exercises, 0)

      // All exercises should now be in group1
      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBe('group1')
      expect(result[2]?.groupId).toBe('group1')
    })

    it('returns unchanged when already in same group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
      ]
      const result = manager.supersetWithNext(exercises, 0)

      expect(result).toEqual(exercises)
    })
  })

  describe('supersetWithPrev', () => {
    it('creates new group when neither has groupId', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      const result = manager.supersetWithPrev(exercises, 1)

      expect(result[0]?.groupId).toBeTruthy()
      expect(result[1]?.groupId).toBeTruthy()
      expect(result[0]?.groupId).toBe(result[1]?.groupId)
    })

    it('merges groups when both have different groupIds', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group2' },
      ]
      const result = manager.supersetWithPrev(exercises, 2)

      // All exercises should now be in group1
      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBe('group1')
      expect(result[2]?.groupId).toBe('group1')
    })
  })

  describe('removeFromSuperset', () => {
    it('dissolves 2-member group completely', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
      ]
      const result = manager.removeFromSuperset(exercises, 0)

      expect(result[0]?.groupId).toBeNull()
      expect(result[1]?.groupId).toBeNull()
    })

    it('maintains group when removing from 3+ member group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]
      const result = manager.removeFromSuperset(exercises, 1)

      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBeNull()
      expect(result[2]?.groupId).toBe('group1')
    })

    it('returns unchanged when exercise not in group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1' },
        { id: '2', name: 'Exercise 2' },
      ]
      const result = manager.removeFromSuperset(exercises, 0)

      expect(result).toEqual(exercises)
    })
  })

  describe('removeSupersetWithNext', () => {
    it('dissolves 2-member group into solo exercises', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
      ]
      const result = manager.removeSupersetWithNext(exercises, 0)

      expect(result[0]?.groupId).toBeNull()
      expect(result[1]?.groupId).toBeNull()
    })

    it('splits 3-member group into 1 solo + 2-member group', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]
      const result = manager.removeSupersetWithNext(exercises, 0)

      expect(result[0]?.groupId).toBeNull()
      expect(result[1]?.groupId).toBeTruthy()
      expect(result[2]?.groupId).toBeTruthy()
      expect(result[1]?.groupId).toBe(result[2]?.groupId)
      expect(result[1]?.groupId).not.toBe('group1')
    })

    it('splits 4-member group into 2-member groups', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
        { id: '4', name: 'Exercise 4', groupId: 'group1' },
      ]
      const result = manager.removeSupersetWithNext(exercises, 1)

      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBe('group1')
      expect(result[2]?.groupId).toBeTruthy()
      expect(result[3]?.groupId).toBeTruthy()
      expect(result[2]?.groupId).toBe(result[3]?.groupId)
      expect(result[2]?.groupId).not.toBe('group1')
    })
  })

  describe('reassignAfterReorder', () => {
    it('removes from group when moved away from all members', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3' },
        { id: '4', name: 'Exercise 4' },
      ]

      // Move exercise at index 1 (after reorder) away from group
      // Simulate moving from index 1 to index 3
      const reordered = [exercises[0]!, exercises[2]!, exercises[3]!, exercises[1]!]

      const result = manager.reassignAfterReorder(reordered, 1, 3)

      expect(result[0]?.groupId).toBeNull() // Dissolved group (< 2 members)
      expect(result[3]?.groupId).toBeNull()
    })

    it('maintains group when moved within group boundaries', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
        { id: '4', name: 'Exercise 4' },
      ]

      // Reorder within group (swap first two)
      const reordered = [exercises[1]!, exercises[0]!, exercises[2]!, exercises[3]!]

      const result = manager.reassignAfterReorder(reordered, 0, 1)

      expect(result[0]?.groupId).toBe('group1')
      expect(result[1]?.groupId).toBe('group1')
      expect(result[2]?.groupId).toBe('group1')
    })

    it('joins group when moved between two members', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3' },
        { id: '4', name: 'Exercise 4', groupId: 'group1' },
      ]

      // Move exercise 3 between group members
      const reordered = [
        exercises[0]!,
        exercises[2]!, // Moved here
        exercises[1]!,
        exercises[3]!,
      ]

      const result = manager.reassignAfterReorder(reordered, 2, 1)

      expect(result[1]?.groupId).toBe('group1')
    })
  })

  describe('validateSupersets', () => {
    it('passes for valid supersets', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3' },
        { id: '4', name: 'Exercise 4', groupId: 'group2' },
        { id: '5', name: 'Exercise 5', groupId: 'group2' },
      ]
      const result = manager.validateSupersets(exercises)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails for single-member groups', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2' },
      ]
      const result = manager.validateSupersets(exercises)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('fails for non-contiguous groups', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]
      const result = manager.validateSupersets(exercises)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('getSupersetStats', () => {
    it('returns correct statistics', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3' },
        { id: '4', name: 'Exercise 4', groupId: 'group2' },
        { id: '5', name: 'Exercise 5', groupId: 'group2' },
        { id: '6', name: 'Exercise 6', groupId: 'group2' },
      ]
      const result = manager.getSupersetStats(exercises)

      expect(result.totalGroups).toBe(2)
      expect(result.groupSizes['group1']).toBe(2)
      expect(result.groupSizes['group2']).toBe(3)
      expect(result.soloExercises).toBe(1)
    })
  })

  describe('getSupersetInfo', () => {
    it('returns correct info for exercise in superset', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]

      const first = manager.getSupersetInfo(exercises, 0)
      expect(first.isInSuperset).toBe(true)
      expect(first.isFirstInSuperset).toBe(true)
      expect(first.isLastInSuperset).toBe(false)

      const middle = manager.getSupersetInfo(exercises, 1)
      expect(middle.isInSuperset).toBe(true)
      expect(middle.isFirstInSuperset).toBe(false)
      expect(middle.isLastInSuperset).toBe(false)

      const last = manager.getSupersetInfo(exercises, 2)
      expect(last.isInSuperset).toBe(true)
      expect(last.isFirstInSuperset).toBe(false)
      expect(last.isLastInSuperset).toBe(true)
    })

    it('returns correct info for solo exercise', () => {
      const exercises = [{ id: '1', name: 'Exercise 1' }]

      const info = manager.getSupersetInfo(exercises, 0)
      expect(info.isInSuperset).toBe(false)
      expect(info.isFirstInSuperset).toBe(false)
      expect(info.isLastInSuperset).toBe(false)
    })
  })

  describe('cleanupAfterRemoval', () => {
    it('returns exercises unchanged when no validation errors', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)
      expect(result).toEqual(exercises)
    })

    it('dissolves single-member groups', () => {
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' }, // Single member
        { id: '2', name: 'Exercise 2' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)
      expect(result[0]!.groupId).toBeNull()
      expect(result[1]!.groupId).toBeUndefined()
    })

    it('keeps adjacent exercises in superset when first is removed', () => {
      // Simulate: [1(A), 2(A), 3(A)] → remove 1 → [2(A), 3(A)]
      const exercises = [
        { id: '2', name: 'Exercise 2', groupId: 'group1' },
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)
      expect(result[0]!.groupId).toBe('group1')
      expect(result[1]!.groupId).toBe('group1')
    })

    it('dissolves superset when middle exercise is removed (non-adjacent)', () => {
      // Simulate: [1(A), 2(A), 3(A)] → remove 2 → [1(A), 3(A)] with gap
      // This would be detected as non-contiguous, so we test with actual gap
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'group1' },
        { id: '4', name: 'Exercise 4' }, // Different exercise in between
        { id: '3', name: 'Exercise 3', groupId: 'group1' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)
      // Each isolated member should be dissolved
      expect(result[0]!.groupId).toBeNull()
      expect(result[1]!.groupId).toBeUndefined()
      expect(result[2]!.groupId).toBeNull()
    })

    it('splits non-contiguous group into separate groups', () => {
      // [1(A), 2(A), 3(B), 4(B), 5(A)] → Group A is non-contiguous
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'groupA' },
        { id: '2', name: 'Exercise 2', groupId: 'groupA' },
        { id: '3', name: 'Exercise 3', groupId: 'groupB' },
        { id: '4', name: 'Exercise 4', groupId: 'groupB' },
        { id: '5', name: 'Exercise 5', groupId: 'groupA' }, // Non-contiguous with 1,2
      ]

      const result = manager.cleanupAfterRemoval(exercises)

      // Group A split: first chunk [1,2] keeps groupA, second chunk [5] is dissolved (single member)
      expect(result[0]!.groupId).toBe('groupA')
      expect(result[1]!.groupId).toBe('groupA')
      expect(result[4]!.groupId).toBeNull() // Single member, dissolved

      // Group B should remain intact
      expect(result[2]!.groupId).toBe('groupB')
      expect(result[3]!.groupId).toBe('groupB')
    })

    it('assigns new groupIds to split chunks (except first)', () => {
      // [1(A), 2(A), 3(X), 4(A), 5(A)] → Group A is non-contiguous
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'groupA' },
        { id: '2', name: 'Exercise 2', groupId: 'groupA' },
        { id: '3', name: 'Exercise 3' },
        { id: '4', name: 'Exercise 4', groupId: 'groupA' },
        { id: '5', name: 'Exercise 5', groupId: 'groupA' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)

      // First chunk [1,2] keeps original groupId
      expect(result[0]!.groupId).toBe('groupA')
      expect(result[1]!.groupId).toBe('groupA')

      // Second chunk [4,5] gets new groupId (not groupA)
      expect(result[3]!.groupId).not.toBe('groupA')
      expect(result[3]!.groupId).toBeTruthy()
      expect(result[4]!.groupId).toBe(result[3]!.groupId) // Same as its chunk
    })

    it('handles multiple groups with different issues', () => {
      // Complex scenario:
      // [1(A), 2(A), 3(B), 4(C), 5(C), 6(C), 7(B)]
      // Group A: valid (contiguous)
      // Group B: non-contiguous (indices 2 and 6)
      // Group C: valid (contiguous)
      const exercises = [
        { id: '1', name: 'Exercise 1', groupId: 'groupA' },
        { id: '2', name: 'Exercise 2', groupId: 'groupA' },
        { id: '3', name: 'Exercise 3', groupId: 'groupB' },
        { id: '4', name: 'Exercise 4', groupId: 'groupC' },
        { id: '5', name: 'Exercise 5', groupId: 'groupC' },
        { id: '6', name: 'Exercise 6', groupId: 'groupC' },
        { id: '7', name: 'Exercise 7', groupId: 'groupB' },
      ]

      const result = manager.cleanupAfterRemoval(exercises)

      // Group A should remain intact
      expect(result[0]!.groupId).toBe('groupA')
      expect(result[1]!.groupId).toBe('groupA')

      // Group B: split and dissolved (single members)
      expect(result[2]!.groupId).toBeNull()
      expect(result[6]!.groupId).toBeNull()

      // Group C should remain intact
      expect(result[3]!.groupId).toBe('groupC')
      expect(result[4]!.groupId).toBe('groupC')
      expect(result[5]!.groupId).toBe('groupC')
    })

    it('handles empty array', () => {
      const exercises: TestExercise[] = []
      const result = manager.cleanupAfterRemoval(exercises)
      expect(result).toEqual([])
    })

    it('handles single exercise with no groupId', () => {
      const exercises = [{ id: '1', name: 'Exercise 1' }]
      const result = manager.cleanupAfterRemoval(exercises)
      expect(result).toEqual(exercises)
    })
  })
})
