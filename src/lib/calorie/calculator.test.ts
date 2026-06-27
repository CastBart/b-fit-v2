import { describe, it, expect } from 'vitest'
import {
  ageFromDob,
  calculateBmr,
  calculateTdee,
  calculateTargetCalories,
  calculateMacros,
  macrosFromPercentages,
  calculateCalories,
  CALORIE_FLOOR,
  DEFAULT_MACRO_PERCENTAGES,
} from './calculator'

describe('ageFromDob', () => {
  it('returns whole years and accounts for birthday not yet reached', () => {
    const now = new Date('2026-06-22')
    expect(ageFromDob(new Date('1990-06-22'), now)).toBe(36)
    expect(ageFromDob(new Date('1990-06-23'), now)).toBe(35) // birthday tomorrow
    expect(ageFromDob(new Date('1990-06-21'), now)).toBe(36) // birthday yesterday
  })
})

describe('calculateBmr (Mifflin-St Jeor)', () => {
  // Male, 80kg, 180cm, 30y: 10*80 + 6.25*180 - 5*30 + 5 = 1780
  it('computes male BMR', () => {
    expect(calculateBmr({ weightKg: 80, heightCm: 180, age: 30, sex: 'MALE' })).toBe(1780)
  })

  // Female, 65kg, 165cm, 30y: 10*65 + 6.25*165 - 5*30 - 161 = 1370.25
  it('computes female BMR', () => {
    expect(calculateBmr({ weightKg: 65, heightCm: 165, age: 30, sex: 'FEMALE' })).toBeCloseTo(
      1370.25
    )
  })
})

describe('calculateTdee', () => {
  it('applies the activity multiplier', () => {
    expect(calculateTdee(1780, 'MODERATELY_ACTIVE')).toBeCloseTo(2759) // 1780 * 1.55
    expect(calculateTdee(1780, 'SEDENTARY')).toBeCloseTo(2136) // 1780 * 1.2
  })
})

describe('calculateTargetCalories', () => {
  it('maintain leaves TDEE unchanged', () => {
    const { target, floorApplied } = calculateTargetCalories(
      2759,
      { direction: 'MAINTAIN', weeklyRateLbs: 0 },
      'MALE'
    )
    expect(target).toBe(2759)
    expect(floorApplied).toBe(false)
  })

  it('subtracts 500 kcal per lb/week when losing', () => {
    expect(
      calculateTargetCalories(2759, { direction: 'LOSE', weeklyRateLbs: 1 }, 'MALE').target
    ).toBe(2259)
    expect(
      calculateTargetCalories(2759, { direction: 'LOSE', weeklyRateLbs: 2 }, 'MALE').target
    ).toBe(1759)
  })

  it('adds 500 kcal per lb/week when gaining', () => {
    expect(
      calculateTargetCalories(2759, { direction: 'GAIN', weeklyRateLbs: 1 }, 'MALE').target
    ).toBe(3259)
  })

  it('clamps to the sex-specific floor and flags it', () => {
    // Female floor 1200; a 1500 TDEE with a 1 lb/week cut (-500) -> 1000 -> clamps to 1200.
    const { target, floorApplied } = calculateTargetCalories(
      1500,
      { direction: 'LOSE', weeklyRateLbs: 1 },
      'FEMALE'
    )
    expect(target).toBe(CALORIE_FLOOR.FEMALE)
    expect(target).toBe(1200)
    expect(floorApplied).toBe(true)
  })
})

describe('macros', () => {
  it('DEFAULT_MACRO_PERCENTAGES sums to 100', () => {
    const { protein, carbs, fat } = DEFAULT_MACRO_PERCENTAGES
    expect(protein + carbs + fat).toBe(100)
  })

  it('macrosFromPercentages grams roughly reconstruct the target', () => {
    const target = 2000
    const m = macrosFromPercentages(target, { protein: 30, carbs: 40, fat: 30 })
    const reconstructed = m.protein * 4 + m.carbs * 4 + m.fat * 9
    expect(reconstructed).toBeGreaterThan(target - 20)
    expect(reconstructed).toBeLessThan(target + 20)
  })

  it('calculateMacros uses the default split', () => {
    const target = 2000
    expect(calculateMacros(target)).toEqual(
      macrosFromPercentages(target, DEFAULT_MACRO_PERCENTAGES)
    )
  })
})

describe('calculateCalories (full pipeline)', () => {
  it('produces rounded BMR/TDEE/target + default macros', () => {
    const result = calculateCalories({
      weightKg: 80,
      heightCm: 180,
      dateOfBirth: new Date('1996-06-22'),
      sex: 'MALE',
      activityLevel: 'MODERATELY_ACTIVE',
      goalDirection: 'LOSE',
      weeklyRateLbs: 1,
      now: new Date('2026-06-22'), // age 30
    })
    expect(result.bmr).toBe(1780)
    expect(result.tdee).toBe(2759)
    expect(result.targetCalories).toBe(2259)
    expect(result.floorApplied).toBe(false)
    expect(result.macros.protein).toBeGreaterThan(0)
  })
})
