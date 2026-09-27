import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] =>
  dates.map((doneAt, i) => ({ fr: `FR-${i + 1}`, doneAt }))

const unmeasured = {
  asIs: { value: null, basis: UNMEASURED },
  active: { value: null, basis: UNMEASURED },
}

describe('velocities', () => {
  describe('not enough dated completions', () => {
    it('returns null rates for no completions', () => {
      expect(velocities([], '2026-01-05')).toEqual(unmeasured)
    })

    it('returns null rates for a single dated completion', () => {
      expect(velocities(done('2026-01-01'), '2026-01-05')).toEqual(unmeasured)
    })

    it('returns null rates when only one completion remains after ignoring undated ones', () => {
      expect(velocities(done('2026-01-01', null, null), '2026-01-05')).toEqual(unmeasured)
    })
  })

  describe('which completions count', () => {
    it('ignores null doneAt', () => {
      const r = velocities(done('2026-01-01', null, '2026-01-02', '2026-01-03'), '2026-01-03')
      expect(r.asIs.basis).toMatch(/^3 dated completion\(s\)/)
    })

    it.each([
      ['2026-1-01'],
      ['2026/01/01'],
      ['20260101'],
      ['2026-01-01T00:00:00Z'],
      [' 2026-01-01'],
      ['not a date'],
      [''],
    ])('ignores malformed date %j', (bad) => {
      const r = velocities(done('2026-01-01', '2026-01-02', '2026-01-03', bad), '2026-01-03')
      expect(r.asIs.basis).toBe(
        '3 dated completion(s) over 3 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it.each([['2026-02-31'], ['2026-08-32'], ['2026-13-01'], ['2026-00-10'], ['2026-02-29'], ['2026-04-31']])(
      'ignores non-existent calendar day %s',
      (bad) => {
        const r = velocities(done('2026-01-01', '2026-01-02', '2026-01-03', bad), '2026-01-03')
        expect(r.asIs.basis).toBe(
          '3 dated completion(s) over 3 calendar day(s) since 2026-01-01, quiet days included',
        )
      },
    )

    it('accepts a leap day in a leap year', () => {
      const r = velocities(done('2028-02-28', '2028-02-29', '2028-03-01'), '2028-03-01')
      expect(r.asIs).toEqual({
        value: 1,
        basis: '3 dated completion(s) over 3 calendar day(s) since 2028-02-28, quiet days included',
      })
    })

    it('returns null rates when invalid dates leave fewer than two', () => {
      expect(velocities(done('2026-01-01', '2026-02-31', 'bogus', null), '2026-01-05')).toEqual(unmeasured)
    })
  })

  describe('two dated completions are enough', () => {
    it('measures rates from exactly two dated completions', () => {
      expect(velocities(done('2026-01-01', '2026-01-02'), '2026-01-04')).toEqual({
        asIs: {
          value: 0.5,
          basis: '2 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
        },
        active: {
          value: 1,
          basis: '2 dated completion(s) over 2 day(s) something completed',
        },
      })
    })

    it('measures two completions on the same day as today', () => {
      expect(velocities(done('2026-01-01', '2026-01-01'), '2026-01-01')).toEqual({
        asIs: {
          value: 2,
          basis: '2 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
        },
        active: {
          value: 2,
          basis: '2 dated completion(s) over 1 day(s) something completed',
        },
      })
    })
  })

  describe('spec example', () => {
    it('gives asIs 0.6 and active 1.5', () => {
      expect(velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')).toEqual({
        asIs: {
          value: 0.6,
          basis: '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
        },
        active: {
          value: 1.5,
          basis: '3 dated completion(s) over 2 day(s) something completed',
        },
      })
    })
  })

  describe('era', () => {
    it('does not depend on input order', () => {
      const r = velocities(done('2026-01-03', '2026-01-01', '2026-01-01'), '2026-01-05')
      expect(r.asIs.value).toBe(0.6)
      expect(r.asIs.basis).toContain('since 2026-01-01')
    })

    it('runs to today when today is after the latest completion', () => {
      const r = velocities(done('2026-01-01', '2026-01-02', '2026-01-03'), '2026-01-10')
      expect(r.asIs.basis).toContain('over 10 calendar day(s)')
      expect(r.asIs.value).toBeCloseTo(0.3)
    })

    it('runs to the latest completion when that is after today', () => {
      const r = velocities(done('2026-01-01', '2026-01-02', '2026-01-10'), '2026-01-05')
      expect(r.asIs.basis).toContain('over 10 calendar day(s)')
      expect(r.asIs.value).toBeCloseTo(0.3)
    })

    it('counts inclusively: a one-day era is 1 day', () => {
      const r = velocities(done('2026-03-04', '2026-03-04', '2026-03-04'), '2026-03-04')
      expect(r.asIs).toEqual({
        value: 3,
        basis: '3 dated completion(s) over 1 calendar day(s) since 2026-03-04, quiet days included',
      })
    })

    it('spans month and year boundaries', () => {
      const r = velocities(done('2025-12-30', '2026-01-01', '2026-01-02'), '2026-01-02')
      expect(r.asIs.basis).toContain('over 4 calendar day(s) since 2025-12-30')
      expect(r.asIs.value).toBe(0.75)
    })

    it('handles leap years in era length', () => {
      const r = velocities(done('2028-02-27', '2028-03-01', '2028-03-01'), '2028-03-01')
      expect(r.asIs.basis).toContain('over 4 calendar day(s)')
    })

    it('ignores invalid dates when choosing the first date', () => {
      const r = velocities(done('2026-00-01', '2026-01-02', '2026-01-03', '2026-01-04'), '2026-01-04')
      expect(r.asIs.basis).toContain('over 3 calendar day(s) since 2026-01-02')
    })
  })

  describe('active rate', () => {
    it('divides by the number of distinct completion dates', () => {
      const r = velocities(
        done('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-05', '2026-01-05', '2026-01-09'),
        '2026-01-20',
      )
      expect(r.active).toEqual({
        value: 2,
        basis: '6 dated completion(s) over 3 day(s) something completed',
      })
    })

    it('is 1 when every completion is on a different day', () => {
      const r = velocities(done('2026-01-01', '2026-01-04', '2026-01-07', '2026-01-08'), '2026-01-08')
      expect(r.active.value).toBe(1)
      expect(r.active.basis).toBe('4 dated completion(s) over 4 day(s) something completed')
    })

    it('is not affected by today', () => {
      const a = velocities(done('2026-01-01', '2026-01-02', '2026-01-02'), '2026-01-02')
      const b = velocities(done('2026-01-01', '2026-01-02', '2026-01-02'), '2027-01-01')
      expect(a.active).toEqual(b.active)
    })
  })
})
