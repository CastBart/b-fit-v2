import {
  weightSteps,
  repsSteps,
  rirSteps,
  distanceSteps,
  durationSteps,
  nearestIndex,
} from './wheel-steps'

describe('weightSteps', () => {
  it('runs 0..300 in 2kg steps', () => {
    const s = weightSteps()
    expect(s[0]).toEqual({ value: 0, label: '0kg' })
    expect(s[1]).toEqual({ value: 2, label: '2kg' })
    expect(s[s.length - 1]).toEqual({ value: 300, label: '300kg' })
  })
})

describe('repsSteps', () => {
  it('runs 1..300', () => {
    const s = repsSteps()
    expect(s[0]).toEqual({ value: 1, label: '1' })
    expect(s[s.length - 1]).toEqual({ value: 300, label: '300' })
    expect(s).toHaveLength(300)
  })
})

describe('rirSteps', () => {
  it('runs 0..5 in 0.5 steps with a 5+ top stop', () => {
    const s = rirSteps()
    expect(s[0]).toEqual({ value: 0, label: '0' })
    expect(s[1]).toEqual({ value: 0.5, label: '0.5' })
    expect(s[s.length - 1]).toEqual({ value: 5, label: '5+' })
    expect(s).toHaveLength(11)
  })
})

describe('distanceSteps', () => {
  it('km: starts at 0.1km (100m) in 0.1 steps, capped at 100km', () => {
    const s = distanceSteps('km')
    expect(s[0]).toEqual({ value: 100, label: '0.10 km' })
    expect(s[1]).toEqual({ value: 200, label: '0.20 km' })
    expect(s[s.length - 1]!.value).toBe(100000)
  })

  it('mi: canonical meters with mile labels', () => {
    const s = distanceSteps('mi')
    expect(s[0]!.label).toBe('0.10 mi')
    expect(s[0]!.value).toBe(Math.round(0.1 * 1609.344))
    expect(s[s.length - 1]!.value).toBeLessThanOrEqual(100000)
  })
})

describe('durationSteps', () => {
  const s = durationSteps()
  const values = s.map((x) => x.value)

  it('covers the variable-interval ranges', () => {
    expect(values).toContain(0)
    expect(values).toContain(59)
    expect(values).toContain(60) // 1min
    expect(values).toContain(65) // 1:05
    expect(values).toContain(300) // 5min
    expect(values).toContain(315) // 5:15
    expect(values).toContain(600) // 10min
    expect(values).toContain(660) // 11min
    expect(values).toContain(3600) // 1hr
    expect(values).toContain(3660) // 1:01hr
  })

  it('does not use 5s steps before 60 or after 300', () => {
    // 55 exists (1s steps), 62 does not (would only exist if 1s continued)
    expect(values).toContain(55)
    expect(values).not.toContain(62)
    // 305 does not exist (15s steps after 300 -> 315 next)
    expect(values).not.toContain(305)
  })

  it('is strictly increasing', () => {
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!)
    }
  })
})

describe('nearestIndex', () => {
  const steps = weightSteps() // 0,2,4,...

  it('finds the nearest step for an off-grid value', () => {
    expect(nearestIndex(steps, 2.5)).toBe(1) // nearest to 2
    expect(nearestIndex(steps, 3.1)).toBe(2) // nearest to 4
    expect(nearestIndex(steps, 4)).toBe(2)
  })

  it('returns 0 for null/undefined', () => {
    expect(nearestIndex(steps, null)).toBe(0)
    expect(nearestIndex(steps, undefined)).toBe(0)
  })
})
