import {
  secondsToHMS,
  hmsToSeconds,
  labelForSeconds,
  secondsToDigits,
  digitsToSeconds,
  formatDigits,
} from './duration'

describe('duration helpers', () => {
  it('splits seconds into h/m/s', () => {
    expect(secondsToHMS(0)).toEqual({ h: 0, m: 0, s: 0 })
    expect(secondsToHMS(59)).toEqual({ h: 0, m: 0, s: 59 })
    expect(secondsToHMS(65)).toEqual({ h: 0, m: 1, s: 5 })
    expect(secondsToHMS(3661)).toEqual({ h: 1, m: 1, s: 1 })
  })

  it('clamps negatives to zero', () => {
    expect(secondsToHMS(-10)).toEqual({ h: 0, m: 0, s: 0 })
  })

  it('round-trips h/m/s <-> seconds', () => {
    for (const total of [0, 7, 65, 315, 600, 3661, 21600]) {
      expect(hmsToSeconds(secondsToHMS(total))).toBe(total)
    }
  })

  it('labels per wheel spec', () => {
    expect(labelForSeconds(30)).toBe('30')
    expect(labelForSeconds(60)).toBe('1min')
    expect(labelForSeconds(65)).toBe('1:05min')
    expect(labelForSeconds(315)).toBe('5:15min')
    expect(labelForSeconds(660)).toBe('11min')
    expect(labelForSeconds(3600)).toBe('1hr')
    expect(labelForSeconds(3660)).toBe('1:01hr')
  })

  it('converts seconds <-> stopwatch digit buffer', () => {
    expect(secondsToDigits(65)).toBe('105') // 1:05
    expect(secondsToDigits(3661)).toBe('10101')
    expect(secondsToDigits(0)).toBe('')
    expect(digitsToSeconds('105')).toBe(65)
    expect(digitsToSeconds('10101')).toBe(3661)
    expect(digitsToSeconds('')).toBe(0)
  })

  it('formats a digit buffer as HH:MM:SS', () => {
    expect(formatDigits('105')).toBe('00:01:05')
    expect(formatDigits('')).toBe('00:00:00')
    expect(formatDigits('123456')).toBe('12:34:56')
  })
})
