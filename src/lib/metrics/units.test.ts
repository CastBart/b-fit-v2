import { metersToUnit, unitToMeters, formatDistance, METERS_PER } from './units'

describe('distance units', () => {
  it('converts meters to km/mi', () => {
    expect(metersToUnit(1000, 'km')).toBeCloseTo(1, 6)
    expect(metersToUnit(1609.344, 'mi')).toBeCloseTo(1, 6)
    expect(metersToUnit(5000, 'km')).toBeCloseTo(5, 6)
  })

  it('converts unit values to meters', () => {
    expect(unitToMeters(1, 'km')).toBeCloseTo(1000, 6)
    expect(unitToMeters(1, 'mi')).toBeCloseTo(1609.344, 6)
    expect(unitToMeters(5.2, 'km')).toBeCloseTo(5200, 6)
  })

  it('round-trips within tolerance', () => {
    for (const unit of ['km', 'mi'] as const) {
      const meters = 4989
      expect(unitToMeters(metersToUnit(meters, unit), unit)).toBeCloseTo(meters, 6)
    }
  })

  it('rounds to integer meters when persisting (caller responsibility)', () => {
    expect(Math.round(unitToMeters(3.1, 'mi'))).toBe(4989)
    expect(Math.round(unitToMeters(5.2, 'km'))).toBe(5200)
  })

  it('formats canonical meters in the chosen unit', () => {
    expect(formatDistance(5200, 'km')).toBe('5.20 km')
    expect(formatDistance(1609.344, 'mi')).toBe('1.00 mi')
    expect(formatDistance(null, 'km')).toBe('')
  })

  it('exposes meters-per-unit constants', () => {
    expect(METERS_PER.km).toBe(1000)
    expect(METERS_PER.mi).toBeCloseTo(1609.344, 6)
  })
})
