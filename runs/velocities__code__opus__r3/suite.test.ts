import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] => dates.map((doneAt, i) => ({ fr: `FR-${i}`, doneAt }))

const unmeasured = {
  asIs: { value: null, basis: UNMEASURED },
  active: { value: null, basis: UNMEASURED },
}

describe('velocities', () => {
  describe('too few dated completions', () => {
    it('returns null rates for no completions', () => {
      expect(velocities([], '2026-01-10')).toEqual(unmeasured)
    })

    it('returns null rates for a single dated completion', () => {
      expect(velocities(done('2026-01-01'), '2026-01-10')).toEqual(unmeasured)
    })

    it('returns null rates for two dated completions', () => {
      // Current behaviour: the threshold is `<= 2`, so two points are also unmeasured.
      expect(velocities(done('2026-01-01', '2026-01-05'), '2026-01-10')).toEqual(unmeasured)
    })

    it('does not count undated completions toward the threshold', () => {
      expect(velocities(done('2026-01-01', null, null, '2026-01-02'), '2026-01-10')).toEqual(unmeasured)
    })

    it('does not count invalid dates toward the threshold', () => {
      expect(velocities(done('2026-01-01', 'garbage', '2026-02-30', '2026-01-02'), '2026-01-10')).toEqual(unmeasured)
    })
  })

  describe('measured rates', () => {
    it('computes as-is over the inclusive span from first completion to today', () => {
      const { asIs } = velocities(done('2026-01-01', '2026-01-02', '2026-01-03'), '2026-01-10')
      expect(asIs.value).toBe(3 / 10)
      expect(asIs.basis).toBe('3 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included')
    })

    it('computes active over distinct completion days', () => {
      const { active } = velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-10')
      expect(active.value).toBe(3 / 2)
      expect(active.basis).toBe('3 dated completion(s) over 2 day(s) something completed')
    })

    it('counts a single day as one calendar day when everything and today coincide', () => {
      const result = velocities(done('2026-01-05', '2026-01-05', '2026-01-05'), '2026-01-05')
      expect(result.asIs.value).toBe(3)
      expect(result.active.value).toBe(3)
    })

    it('sorts dates regardless of input order', () => {
      const { asIs } = velocities(done('2026-01-03', '2026-01-01', '2026-01-02'), '2026-01-03')
      expect(asIs.value).toBe(1)
      expect(asIs.basis).toContain('since 2026-01-01')
    })

    it('ends the era at the last completion when it is after today', () => {
      const { asIs } = velocities(done('2026-01-01', '2026-01-02', '2026-01-20'), '2026-01-10')
      expect(asIs.value).toBe(3 / 20)
      expect(asIs.basis).toContain('over 20 calendar day(s)')
    })

    it('ignores undated and invalid completions in the counts', () => {
      const result = velocities(
        done('2026-01-01', null, '2026-01-02', 'not-a-date', '2026-1-3', '2026-13-01', '2026-01-03T00:00:00Z', '2026-01-04'),
        '2026-01-04',
      )
      expect(result.asIs.value).toBe(3 / 4)
      expect(result.active.value).toBe(1)
    })

    it('accepts a leap day and rejects a non-leap Feb 29', () => {
      const leap = velocities(done('2024-02-28', '2024-02-29', '2024-03-01'), '2024-03-01')
      expect(leap.asIs.value).toBe(1)

      const nonLeap = velocities(done('2025-02-28', '2025-02-29', '2025-03-01'), '2025-03-01')
      expect(nonLeap).toEqual(unmeasured)
    })

    it('spans month and year boundaries correctly', () => {
      const { asIs } = velocities(done('2025-12-31', '2026-01-01', '2026-01-01'), '2026-01-01')
      expect(asIs.value).toBe(3 / 2)
      expect(asIs.basis).toContain('over 2 calendar day(s) since 2025-12-31')
    })

    it('does not mutate the input', () => {
      const input = done('2026-01-03', '2026-01-01', '2026-01-02')
      const copy = structuredClone(input)
      velocities(input, '2026-01-10')
      expect(input).toEqual(copy)
    })
  })
})
