import { describe, expect, it } from 'vitest'
import { type Completion, velocities } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] => dates.map((doneAt, i) => ({ fr: `FR-${i}`, doneAt }))

describe('velocities', () => {
  describe('unmeasured', () => {
    it('returns null rates for no completions', () => {
      expect(velocities([], '2024-01-10')).toEqual({
        asIs: { value: null, basis: UNMEASURED },
        active: { value: null, basis: UNMEASURED },
      })
    })

    it('returns null rates for a single dated completion', () => {
      const result = velocities(done('2024-01-01'), '2024-01-10')
      expect(result.asIs.value).toBeNull()
      expect(result.active.value).toBeNull()
    })

    it('does not count undated or invalid completions toward the minimum', () => {
      const result = velocities(done('2024-01-01', null, 'not-a-date', '2024-02-30'), '2024-01-10')
      expect(result.asIs).toEqual({ value: null, basis: UNMEASURED })
      expect(result.active).toEqual({ value: null, basis: UNMEASURED })
    })
  })

  describe('measured', () => {
    it('computes both rates over distinct dates', () => {
      const result = velocities(done('2024-01-01', '2024-01-03', '2024-01-05'), '2024-01-05')
      expect(result.asIs).toEqual({
        value: 3 / 5,
        basis: '3 dated completion(s) over 5 calendar day(s) since 2024-01-01, quiet days included',
      })
      expect(result.active).toEqual({
        value: 1,
        basis: '3 dated completion(s) over 3 day(s) something completed',
      })
    })

    it('counts the era inclusively when everything completed on one day', () => {
      const result = velocities(done('2024-01-01', '2024-01-01', '2024-01-01'), '2024-01-01')
      expect(result.asIs.value).toBe(3)
      expect(result.active.value).toBe(3)
      expect(result.asIs.basis).toContain('over 1 calendar day(s)')
      expect(result.active.basis).toContain('over 1 day(s)')
    })

    it('counts same-day completions once toward active days', () => {
      const result = velocities(done('2024-01-01', '2024-01-01', '2024-01-02', '2024-01-02'), '2024-01-02')
      expect(result.active.value).toBe(2)
      expect(result.asIs.value).toBe(2)
    })

    it('extends the era to today, including trailing quiet days', () => {
      const result = velocities(done('2024-01-01', '2024-01-02', '2024-01-03'), '2024-01-10')
      expect(result.asIs.value).toBe(3 / 10)
      expect(result.asIs.basis).toContain('over 10 calendar day(s) since 2024-01-01')
      expect(result.active.value).toBe(1)
    })

    it('ends the era at the last completion when it is after today', () => {
      const result = velocities(done('2024-01-01', '2024-01-02', '2024-01-04'), '2024-01-02')
      expect(result.asIs.value).toBe(3 / 4)
      expect(result.asIs.basis).toContain('over 4 calendar day(s)')
    })

    it('is independent of input order', () => {
      const result = velocities(done('2024-01-05', '2024-01-01', '2024-01-03'), '2024-01-05')
      expect(result.asIs.value).toBe(3 / 5)
      expect(result.asIs.basis).toContain('since 2024-01-01')
    })

    it('ignores undated and invalid completions', () => {
      const result = velocities(
        done('2024-01-01', null, '2024-01-03', '2024-13-01', '2024-1-4', '2024-01-05T10:00:00Z', '2024-01-05'),
        '2024-01-05',
      )
      expect(result.asIs.value).toBe(3 / 5)
      expect(result.asIs.basis).toMatch(/^3 dated completion\(s\)/)
      expect(result.active.value).toBe(1)
    })

    it('accepts leap days as valid dates', () => {
      const result = velocities(done('2024-02-28', '2024-02-29', '2024-03-01'), '2024-03-01')
      expect(result.asIs.value).toBe(1)
      expect(result.asIs.basis).toContain('over 3 calendar day(s)')
    })

    it('rejects Feb 29 in non-leap years', () => {
      const result = velocities(done('2023-02-28', '2023-02-29', '2023-03-01', '2023-03-02'), '2023-03-02')
      expect(result.asIs.basis).toMatch(/^3 dated completion\(s\) over 3 calendar day\(s\)/)
    })

    it('spans month and year boundaries', () => {
      const result = velocities(done('2023-12-31', '2024-01-01', '2024-01-31'), '2024-01-31')
      expect(result.asIs.basis).toContain('over 32 calendar day(s) since 2023-12-31')
      expect(result.asIs.value).toBe(3 / 32)
    })
  })
})
