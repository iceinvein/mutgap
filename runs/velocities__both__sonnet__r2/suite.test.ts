import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

function completion(fr: string, doneAt: string | null): Completion {
  return { fr, doneAt }
}

describe('velocities', () => {
  describe('not enough dated completions', () => {
    it('returns null values for zero completions', () => {
      const result = velocities([], '2026-01-05')
      expect(result).toEqual({
        asIs: { value: null, basis: UNMEASURED },
        active: { value: null, basis: UNMEASURED },
      })
    })

    it('returns null values for a single dated completion', () => {
      const result = velocities([completion('a', '2026-01-01')], '2026-01-05')
      expect(result.asIs).toEqual({ value: null, basis: UNMEASURED })
      expect(result.active).toEqual({ value: null, basis: UNMEASURED })
    })

    it('ignores completions with null doneAt when counting', () => {
      const result = velocities(
        [completion('a', null), completion('b', null)],
        '2026-01-05',
      )
      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })

    it('ignores completions whose doneAt is not YYYY-MM-DD form', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', 'not-a-date')],
        '2026-01-05',
      )
      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })

    it('ignores completions whose doneAt names no real calendar day', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-02-31')],
        '2026-01-05',
      )
      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })

    it('ignores completions whose doneAt overflows the month (2026-08-32)', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-08-32')],
        '2026-01-05',
      )
      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })
  })

  describe('two or more dated completions are enough to measure', () => {
    it('measures a rate from exactly two dated completions', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-01-02')],
        '2026-01-02',
      )
      expect(result.asIs.value).toBe(1)
      expect(result.active.value).toBe(1)
    })
  })

  describe('the worked example from the spec', () => {
    it('computes asIs and active for repeated and distinct dates', () => {
      const result = velocities(
        [
          completion('a', '2026-01-01'),
          completion('b', '2026-01-01'),
          completion('c', '2026-01-03'),
        ],
        '2026-01-05',
      )
      expect(result.asIs.value).toBeCloseTo(0.6)
      expect(result.active.value).toBeCloseTo(1.5)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.basis).toBe(
        '3 dated completion(s) over 2 day(s) something completed',
      )
    })
  })

  describe('era length', () => {
    it('is 1 day when the era starts and ends on the same day', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-01-01')],
        '2026-01-01',
      )
      expect(result.asIs.value).toBe(2)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('extends to today when today is later than the last completion', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-01-02')],
        '2026-01-10',
      )
      // era: 2026-01-01 .. 2026-01-10 inclusive = 10 days
      expect(result.asIs.value).toBeCloseTo(2 / 10)
      expect(result.asIs.basis).toContain('over 10 calendar day(s)')
    })

    it('extends to the latest completion when it is later than today', () => {
      const result = velocities(
        [completion('a', '2026-01-01'), completion('b', '2026-01-10')],
        '2026-01-02',
      )
      // era: 2026-01-01 .. 2026-01-10 inclusive = 10 days, even though today is earlier
      expect(result.asIs.value).toBeCloseTo(2 / 10)
      expect(result.asIs.basis).toContain('over 10 calendar day(s)')
    })
  })

  describe('active rate counts distinct dates', () => {
    it('divides by distinct dates, not total completions', () => {
      const result = velocities(
        [
          completion('a', '2026-01-01'),
          completion('b', '2026-01-01'),
          completion('c', '2026-01-01'),
          completion('d', '2026-01-02'),
        ],
        '2026-01-02',
      )
      expect(result.active.value).toBe(2) // 4 completions / 2 distinct dates
      expect(result.asIs.value).toBe(2) // 4 completions / 2 calendar days
    })
  })

  describe('mixed dated and undated completions', () => {
    it('only counts dated completions towards n, eraDays, and activeDays', () => {
      const result = velocities(
        [
          completion('a', '2026-01-01'),
          completion('b', null),
          completion('c', '2026-01-03'),
          completion('d', 'bogus'),
        ],
        '2026-01-03',
      )
      expect(result.asIs.value).toBe(2 / 3)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 3 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.value).toBe(1)
    })
  })
})
