import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] => dates.map((doneAt, i) => ({ fr: `FR-${i}`, doneAt }))

const unmeasured = {
  asIs: { value: null, basis: UNMEASURED },
  active: { value: null, basis: UNMEASURED },
}

describe('velocities', () => {
  it('matches the worked example in the spec', () => {
    const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')
    expect(result.asIs.value).toBeCloseTo(0.6)
    expect(result.asIs.basis).toBe(
      '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
    )
    expect(result.active.value).toBe(1.5)
    expect(result.active.basis).toBe('3 dated completion(s) over 2 day(s) something completed')
  })

  describe('not enough dated completions', () => {
    it('returns unmeasured for no completions', () => {
      expect(velocities([], '2026-01-05')).toEqual(unmeasured)
    })

    it('returns unmeasured for a single dated completion', () => {
      expect(velocities(done('2026-01-01'), '2026-01-05')).toEqual(unmeasured)
    })

    it('returns unmeasured when only one completion is dated', () => {
      expect(velocities(done('2026-01-01', null, 'not-a-date'), '2026-01-05')).toEqual(unmeasured)
    })
  })

  it('measures with exactly two dated completions', () => {
    const result = velocities(done('2026-01-01', '2026-01-02'), '2026-01-04')
    expect(result.asIs).toEqual({
      value: 0.5,
      basis: '2 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
    })
    expect(result.active).toEqual({
      value: 1,
      basis: '2 dated completion(s) over 2 day(s) something completed',
    })
  })

  describe('ignored completions', () => {
    it.each([
      ['null', null],
      ['a non-date string', 'soon'],
      ['a date with a time', '2026-01-02T10:00:00Z'],
      ['an unpadded date', '2026-1-2'],
      ['a slash-separated date', '2026/01/02'],
      ['an impossible day of month', '2026-02-31'],
      ['day 32', '2026-08-32'],
      ['month 13', '2026-13-01'],
      ['day 00', '2026-01-00'],
      ['29 February in a non-leap year', '2025-02-29'],
      ['an empty string', ''],
    ])('ignores %s', (_label, doneAt) => {
      const result = velocities(done('2026-01-01', '2026-01-02', '2026-01-03', doneAt), '2026-01-03')
      expect(result.asIs.value).toBe(1)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 3 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.basis).toBe('3 dated completion(s) over 3 day(s) something completed')
    })

    it('accepts 29 February in a leap year', () => {
      const result = velocities(done('2024-02-28', '2024-02-29', '2024-03-01'), '2024-03-01')
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 3 calendar day(s) since 2024-02-28, quiet days included',
      )
    })
  })

  describe('era', () => {
    it('is 1 day when everything, including today, falls on one date', () => {
      const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-01'), '2026-01-01')
      expect(result.asIs.value).toBe(3)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
      )
      expect(result.active.value).toBe(3)
      expect(result.active.basis).toBe('3 dated completion(s) over 1 day(s) something completed')
    })

    it('ends at the latest completion when it is after today', () => {
      const result = velocities(done('2026-01-01', '2026-01-05', '2026-01-10'), '2026-01-03')
      expect(result.asIs.value).toBeCloseTo(0.3)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('starts at the earliest completion regardless of input order', () => {
      const result = velocities(done('2026-01-05', '2026-01-01', '2026-01-03'), '2026-01-05')
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('counts calendar days across month and year boundaries', () => {
      const result = velocities(done('2025-12-30', '2026-01-01', '2026-01-02'), '2026-03-01')
      // 2025-12-30 .. 2026-03-01 inclusive: 2 + 31 + 28 + 1 = 62
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 62 calendar day(s) since 2025-12-30, quiet days included',
      )
      expect(result.asIs.value).toBeCloseTo(3 / 62)
    })
  })

  describe('active', () => {
    it('counts every completion on a shared date towards n but the date once', () => {
      const result = velocities(
        done('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-04'),
        '2026-01-04',
      )
      expect(result.active).toEqual({
        value: 2,
        basis: '4 dated completion(s) over 2 day(s) something completed',
      })
      expect(result.asIs).toEqual({
        value: 1,
        basis: '4 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
      })
    })

    it('excludes ignored completions from both n and the active days', () => {
      const result = velocities(done('2026-01-01', null, '2026-01-02', '2026-02-31', '2026-01-02'), '2026-01-02')
      expect(result.active).toEqual({
        value: 1.5,
        basis: '3 dated completion(s) over 2 day(s) something completed',
      })
    })
  })
})
