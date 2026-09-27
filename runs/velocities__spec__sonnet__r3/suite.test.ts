import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH_BASIS = 'not enough dated completions to measure a rate; one point is not a rate'

const c = (doneAt: string | null, fr = 'FR-1'): Completion => ({ fr, doneAt })

describe('velocities', () => {
  describe('not enough dated completions', () => {
    it('returns null values with the "not enough" basis when there are zero completions', () => {
      const result = velocities([], '2026-01-05')

      expect(result.asIs).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
      expect(result.active).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
    })

    it('returns null values when there is only one dated completion', () => {
      const result = velocities([c('2026-01-01')], '2026-01-05')

      expect(result.asIs).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
      expect(result.active).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
    })

    it('treats undated and unparseable completions as not counting towards the minimum', () => {
      const result = velocities(
        [c(null), c('not-a-date'), c('2026-01-01')],
        '2026-01-05',
      )

      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })

    it('is satisfied by exactly two dated completions', () => {
      const result = velocities([c('2026-01-01'), c('2026-01-03')], '2026-01-05')

      expect(result.asIs.value).not.toBeNull()
      expect(result.active.value).not.toBeNull()
    })
  })

  describe('ignoring invalid doneAt values', () => {
    it('ignores a null doneAt', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-03'), c(null)],
        '2026-01-05',
      )

      expect(result.asIs.basis).toContain('2 dated completion')
    })

    it('ignores strings that are not in YYYY-MM-DD form', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-03'), c('01/01/2026'), c('2026-1-1'), c('2026-01-01T00:00:00Z')],
        '2026-01-05',
      )

      expect(result.asIs.basis).toContain('2 dated completion')
    })

    it('ignores dates naming a day that does not exist, like 2026-02-31', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-03'), c('2026-02-31')],
        '2026-01-05',
      )

      expect(result.asIs.basis).toContain('2 dated completion')
    })

    it('ignores dates naming a day that does not exist, like 2026-08-32', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-03'), c('2026-08-32')],
        '2026-01-05',
      )

      expect(result.asIs.basis).toContain('2 dated completion')
    })

    it('ignores an out-of-range month', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-03'), c('2026-13-01')],
        '2026-01-05',
      )

      expect(result.asIs.basis).toContain('2 dated completion')
    })

    it('rejects Feb 29 on a non-leap year but accepts it on a leap year', () => {
      const nonLeap = velocities(
        [c('2026-01-01'), c('2026-01-03'), c('2026-02-29')],
        '2026-01-05',
      )
      expect(nonLeap.asIs.basis).toContain('2 dated completion')

      const leap = velocities(
        [c('2024-01-01'), c('2024-01-03'), c('2024-02-29')],
        '2024-03-01',
      )
      expect(leap.asIs.basis).toContain('3 dated completion')
    })
  })

  describe('the worked example from the spec', () => {
    it('computes asIs 0.6 and active 1.5 for two completions on one day and one on another', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-01'), c('2026-01-03')],
        '2026-01-05',
      )

      expect(result.asIs.value).toBeCloseTo(0.6)
      expect(result.active.value).toBeCloseTo(1.5)
    })
  })

  describe('asIs rate', () => {
    it('divides dated completion count by inclusive era length in days', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-02'), c('2026-01-03'), c('2026-01-04'), c('2026-01-05')],
        '2026-01-05',
      )

      // era: 2026-01-01..2026-01-05 inclusive = 5 days, 5 completions
      expect(result.asIs.value).toBeCloseTo(1)
      expect(result.asIs.basis).toBe(
        '5 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('is 1 day when the era starts and ends on the same day', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-01')],
        '2026-01-01',
      )

      expect(result.asIs.value).toBeCloseTo(2)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('extends the era to today when today is later than the latest completion', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-02')],
        '2026-01-10',
      )

      // era: 2026-01-01..2026-01-10 inclusive = 10 days
      expect(result.asIs.value).toBeCloseTo(2 / 10)
      expect(result.asIs.basis).toContain('over 10 calendar day(s)')
    })

    it('extends the era to the latest completion when it is later than today', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-10')],
        '2026-01-02',
      )

      // era: 2026-01-01..2026-01-10 inclusive = 10 days
      expect(result.asIs.value).toBeCloseTo(2 / 10)
      expect(result.asIs.basis).toContain('over 10 calendar day(s)')
    })

    it('anchors "since" on the earliest dated completion regardless of input order', () => {
      const result = velocities(
        [c('2026-01-03'), c('2026-01-01')],
        '2026-01-03',
      )

      expect(result.asIs.basis).toContain('since 2026-01-01')
    })
  })

  describe('active rate', () => {
    it('divides dated completion count by the number of distinct dates', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-01'), c('2026-01-03')],
        '2026-01-05',
      )

      expect(result.active.value).toBeCloseTo(3 / 2)
      expect(result.active.basis).toBe(
        '3 dated completion(s) over 2 day(s) something completed',
      )
    })

    it('is unaffected by quiet days with no completions', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-01'), c('2026-01-03')],
        '2026-06-01',
      )

      expect(result.active.value).toBeCloseTo(3 / 2)
    })

    it('counts every completion on a repeated date towards n', () => {
      const result = velocities(
        [c('2026-01-01'), c('2026-01-01'), c('2026-01-01')],
        '2026-01-01',
      )

      expect(result.active.value).toBeCloseTo(3)
      expect(result.active.basis).toBe(
        '3 dated completion(s) over 1 day(s) something completed',
      )
    })
  })
})
