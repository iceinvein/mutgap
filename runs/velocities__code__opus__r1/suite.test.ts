import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] => dates.map((doneAt, i) => ({ fr: `FR-${i}`, doneAt }))

const unmeasured = {
  asIs: { value: null, basis: UNMEASURED },
  active: { value: null, basis: UNMEASURED },
}

describe('velocities', () => {
  describe('when there are too few dated completions', () => {
    it('returns null rates for no completions', () => {
      expect(velocities([], '2024-01-10')).toEqual(unmeasured)
    })

    it('returns null rates for a single dated completion', () => {
      expect(velocities(done('2024-01-01'), '2024-01-10')).toEqual(unmeasured)
    })

    it('ignores undated completions when counting', () => {
      expect(velocities(done(null, null, null, '2024-01-01'), '2024-01-10')).toEqual(unmeasured)
    })

    it('ignores invalid dates when counting', () => {
      expect(
        velocities(done('2024-02-30', '2024-1-05', '2024-01-05T10:00:00Z', 'yesterday', '', '2024-01-01'), '2024-01-10'),
      ).toEqual(unmeasured)
    })
  })

  describe('with enough dated completions', () => {
    it('computes as-is rate over the calendar era up to today and active rate over distinct days', () => {
      const result = velocities(done('2024-01-01', '2024-01-03', '2024-01-03'), '2024-01-10')

      expect(result.asIs.value).toBeCloseTo(3 / 10)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 10 calendar day(s) since 2024-01-01, quiet days included',
      )
      expect(result.active.value).toBeCloseTo(3 / 2)
      expect(result.active.basis).toBe("3 dated completion(s) over 2 day(s) something completed")
    })

    it('counts the era inclusively, so all completions on today gives one day', () => {
      const result = velocities(done('2024-01-10', '2024-01-10', '2024-01-10'), '2024-01-10')

      expect(result.asIs.value).toBe(3)
      expect(result.asIs.basis).toContain('over 1 calendar day(s) since 2024-01-10')
      expect(result.active.value).toBe(3)
    })

    it('does not depend on input order', () => {
      const ordered = velocities(done('2024-01-01', '2024-01-02', '2024-01-05'), '2024-01-06')
      const shuffled = velocities(done('2024-01-05', '2024-01-01', '2024-01-02'), '2024-01-06')

      expect(shuffled).toEqual(ordered)
      expect(shuffled.asIs.basis).toContain('since 2024-01-01')
    })

    it('extends the era to the last completion when it is after today', () => {
      const result = velocities(done('2024-01-01', '2024-01-05', '2024-01-20'), '2024-01-10')

      expect(result.asIs.value).toBeCloseTo(3 / 20)
      expect(result.asIs.basis).toContain('over 20 calendar day(s)')
    })

    it('excludes undated and invalid completions from the rates', () => {
      const result = velocities(
        done('2024-01-01', null, '2024-01-02', '2023-13-01', '2024-01-04', 'not-a-date'),
        '2024-01-04',
      )

      expect(result.asIs.value).toBeCloseTo(3 / 4)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 4 calendar day(s) since 2024-01-01, quiet days included',
      )
      expect(result.active.value).toBe(1)
    })

    it('accepts leap days as valid dates', () => {
      const result = velocities(done('2024-02-28', '2024-02-29', '2024-03-01'), '2024-03-01')

      expect(result.asIs.value).toBe(1)
      expect(result.asIs.basis).toContain('over 3 calendar day(s)')
      expect(result.active.value).toBe(1)
    })

    it('rejects Feb 29 in a non-leap year', () => {
      expect(velocities(done('2023-02-28', '2023-02-29', '2023-03-01'), '2023-03-01')).toEqual(unmeasured)
    })

    it('counts eras spanning a year boundary', () => {
      const result = velocities(done('2023-12-30', '2023-12-31', '2024-01-01'), '2024-01-02')

      expect(result.asIs.value).toBeCloseTo(3 / 4)
      expect(result.asIs.basis).toContain('over 4 calendar day(s) since 2023-12-30')
    })
  })
})
