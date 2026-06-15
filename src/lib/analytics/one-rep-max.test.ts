/**
 * estimateOneRepMax Unit Tests
 */

import { estimateOneRepMax } from './one-rep-max'

describe('estimateOneRepMax', () => {
  it('computes Epley with RIR-adjusted effective reps', () => {
    // 100kg x 8 reps, RIR 2 -> effectiveReps 10 -> 100 * (1 + 10/30) = 133.33...
    expect(estimateOneRepMax(100, 8, 2)).toBeCloseTo(133.333, 2)
  })

  it('treats null RIR as 0 (assumes set taken to failure)', () => {
    // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.66...
    expect(estimateOneRepMax(100, 5, null)).toBeCloseTo(116.667, 2)
    expect(estimateOneRepMax(100, 5, undefined)).toBeCloseTo(116.667, 2)
  })

  it('equals the weight for a true single (1 rep, RIR 0)', () => {
    expect(estimateOneRepMax(120, 1, 0)).toBeCloseTo(124, 2) // 120 * (1 + 1/30)
  })

  it('returns null when weight is missing', () => {
    expect(estimateOneRepMax(null, 8, 2)).toBeNull()
    expect(estimateOneRepMax(undefined, 8, 2)).toBeNull()
  })

  it('returns null when reps is missing', () => {
    expect(estimateOneRepMax(100, null, 2)).toBeNull()
  })

  it('returns null for non-positive weight or reps', () => {
    expect(estimateOneRepMax(0, 8, 2)).toBeNull()
    expect(estimateOneRepMax(100, 0, 2)).toBeNull()
    expect(estimateOneRepMax(-50, 8, 2)).toBeNull()
  })

  it('returns null for non-finite inputs', () => {
    expect(estimateOneRepMax(NaN, 8, 2)).toBeNull()
    expect(estimateOneRepMax(100, Infinity, 2)).toBeNull()
  })
})
