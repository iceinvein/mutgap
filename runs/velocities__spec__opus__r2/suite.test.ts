import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] =>
  dates.map((doneAt, i) => ({ fr: `FR-${i + 1}`, doneAt }))

describe('velocities', () => {
  describe('spec example', () => {
    it('gives asIs 0.6 and active 1.5 for 2026-01-01, 2026-01-01, 2026-01-03 up to 2026-01-05', () => {
      const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(0.6, 10)
      expect(result.active.value).toBeCloseTo(1.5, 10)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.basis).toBe('3 dated completion(s) over 2 day(s) something completed')
    })
  })

  describe('not enough dated completions', () => {
    const expectNotEnough = (result: ReturnType<typeof velocities>) => {
      expect(result).toEqual({
        asIs: { value: null, basis: NOT_ENOUGH },
        active: { value: null, basis: NOT_ENOUGH },
      })
    }

    it('returns null rates for no completions', () => {
      expectNotEnough(velocities([], '2026-01-05'))
    })

    it('returns null rates for a single dated completion', () => {
      expectNotEnough(velocities(done('2026-01-01'), '2026-01-05'))
    })

    it('returns null rates when all completions are undated', () => {
      expectNotEnough(velocities(done(null, null, null), '2026-01-05'))
    })

    it('returns null rates when only one completion is dated among undated and invalid ones', () => {
      expectNotEnough(
        velocities(done(null, '2026-01-02', 'not a date', '2026-02-31', '2026-08-32'), '2026-01-05'),
      )
    })
  })

  describe('exactly two dated completions is enough', () => {
    it('measures with two completions on different days', () => {
      const result = velocities(done('2026-01-01', '2026-01-02'), '2026-01-04')
      expect(result.asIs.value).toBeCloseTo(0.5, 10)
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.basis).toBe('2 dated completion(s) over 2 day(s) something completed')
    })

    it('measures with two completions on the same day as today (era of 1 day)', () => {
      const result = velocities(done('2026-03-10', '2026-03-10'), '2026-03-10')
      expect(result.asIs.value).toBeCloseTo(2, 10)
      expect(result.active.value).toBeCloseTo(2, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 1 calendar day(s) since 2026-03-10, quiet days included',
      )
      expect(result.active.basis).toBe('2 dated completion(s) over 1 day(s) something completed')
    })
  })

  describe('ignoring undated and invalid completions', () => {
    it('ignores null doneAt', () => {
      const result = velocities(done('2026-01-01', null, '2026-01-03', null), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(2 / 5, 10)
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it.each([
      ['2026-02-31', 'day past end of February'],
      ['2026-08-32', 'day 32'],
      ['2026-04-31', 'day past end of a 30-day month'],
      ['2026-02-29', 'Feb 29 in a non-leap year'],
      ['2100-02-29', 'Feb 29 in a century non-leap year'],
      ['2026-00-10', 'month 0'],
      ['2026-13-01', 'month 13'],
      ['2026-01-00', 'day 0'],
      ['2026-1-05', 'single-digit month'],
      ['2026-01-5', 'single-digit day'],
      ['26-01-05', 'two-digit year'],
      ['2026/01/05', 'slashes'],
      ['20260105', 'no separators'],
      [' 2026-01-05', 'leading whitespace'],
      ['2026-01-05 ', 'trailing whitespace'],
      ['2026-01-05T00:00:00Z', 'ISO timestamp'],
      ['', 'empty string'],
      ['yesterday', 'free text'],
    ])('ignores %j (%s)', (bad) => {
      // bad date sits earliest-looking and would change the era or counts if it were used
      const result = velocities(done(bad, '2026-01-10', '2026-01-11'), '2026-01-12')
      expect(result.asIs.value).toBeCloseTo(2 / 3, 10)
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 3 calendar day(s) since 2026-01-10, quiet days included',
      )
      expect(result.active.basis).toBe('2 dated completion(s) over 2 day(s) something completed')
    })

    it('accepts Feb 29 in a leap year', () => {
      const result = velocities(done('2024-02-28', '2024-02-29'), '2024-03-01')
      expect(result.asIs.value).toBeCloseTo(2 / 3, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 3 calendar day(s) since 2024-02-28, quiet days included',
      )
    })

    it('accepts Feb 29 in a 400-divisible leap year', () => {
      const result = velocities(done('2000-02-29', '2000-03-01'), '2000-03-01')
      expect(result.asIs.value).toBeCloseTo(1, 10)
      expect(result.active.value).toBeCloseTo(1, 10)
    })

    it('accepts the last day of 31-day months', () => {
      const result = velocities(done('2026-08-31', '2026-12-31'), '2026-12-31')
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 123 calendar day(s) since 2026-08-31, quiet days included',
      )
    })
  })

  describe('era', () => {
    it('does not depend on input order', () => {
      const result = velocities(done('2026-01-03', '2026-01-01', '2026-01-01'), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(0.6, 10)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('ends at the latest completion when it is after today', () => {
      const result = velocities(done('2026-01-01', '2026-01-10'), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(2 / 10, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('ends at the latest completion when today is before every completion', () => {
      const result = velocities(done('2026-01-10', '2026-01-12'), '2026-01-01')
      expect(result.asIs.value).toBeCloseTo(2 / 3, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 3 calendar day(s) since 2026-01-10, quiet days included',
      )
    })

    it('ends at today when today equals the latest completion', () => {
      const result = velocities(done('2026-01-01', '2026-01-04'), '2026-01-04')
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('counts across a month boundary', () => {
      const result = velocities(done('2026-01-30', '2026-02-02'), '2026-02-02')
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 4 calendar day(s) since 2026-01-30, quiet days included',
      )
    })

    it('counts across a year boundary', () => {
      const result = velocities(done('2025-12-31', '2026-01-01'), '2026-01-01')
      expect(result.asIs.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 2 calendar day(s) since 2025-12-31, quiet days included',
      )
    })

    it('counts across daylight-saving transitions without drift', () => {
      // spans both northern and southern hemisphere DST changes
      const result = velocities(done('2026-01-01', '2026-06-30'), '2026-12-31')
      expect(result.asIs.value).toBeCloseTo(2 / 365, 10)
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 365 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('counts a full leap year as 366 days', () => {
      const result = velocities(done('2024-01-01', '2024-12-31'), '2024-12-31')
      expect(result.asIs.basis).toBe(
        '2 dated completion(s) over 366 calendar day(s) since 2024-01-01, quiet days included',
      )
    })
  })

  describe('active rate', () => {
    it('counts every completion on a shared date towards n', () => {
      const result = velocities(
        done('2026-05-01', '2026-05-01', '2026-05-01', '2026-05-01', '2026-05-03'),
        '2026-05-03',
      )
      expect(result.active.value).toBeCloseTo(5 / 2, 10)
      expect(result.active.basis).toBe('5 dated completion(s) over 2 day(s) something completed')
      expect(result.asIs.value).toBeCloseTo(5 / 3, 10)
    })

    it('equals 1 when every completion is on a distinct date', () => {
      const result = velocities(done('2026-05-01', '2026-05-04', '2026-05-09'), '2026-05-20')
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.active.basis).toBe('3 dated completion(s) over 3 day(s) something completed')
      expect(result.asIs.value).toBeCloseTo(3 / 20, 10)
    })

    it('does not count invalid or undated completions towards active days', () => {
      const result = velocities(done('2026-05-01', '2026-05-01', null, '2026-05-40'), '2026-05-01')
      expect(result.active.value).toBeCloseTo(2, 10)
      expect(result.active.basis).toBe('2 dated completion(s) over 1 day(s) something completed')
    })
  })

  it('does not mutate its input', () => {
    const input = done('2026-01-03', null, '2026-01-01')
    const copy = structuredClone(input)
    velocities(input, '2026-01-05')
    expect(input).toEqual(copy)
  })
})
