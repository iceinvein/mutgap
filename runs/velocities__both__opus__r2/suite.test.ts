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
    it('is unmeasured with no completions', () => {
      expect(velocities([], '2026-01-05')).toEqual(unmeasured)
    })

    it('is unmeasured with a single dated completion', () => {
      expect(velocities(done('2026-01-01'), '2026-01-05')).toEqual(unmeasured)
    })

    it('is unmeasured when only one completion is dated and the rest are null', () => {
      expect(velocities(done(null, '2026-01-01', null), '2026-01-05')).toEqual(unmeasured)
    })
  })

  describe('exactly two dated completions', () => {
    it('is enough to measure', () => {
      const result = velocities(done('2026-01-01', '2026-01-03'), '2026-01-04')
      expect(result.asIs).toEqual({
        value: 2 / 4,
        basis: '2 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
      })
      expect(result.active).toEqual({
        value: 1,
        basis: '2 dated completion(s) over 2 day(s) something completed',
      })
    })

    it('is enough to measure when both are on the same day', () => {
      const result = velocities(done('2026-01-01', '2026-01-01'), '2026-01-01')
      expect(result.asIs.value).toBe(2)
      expect(result.active.value).toBe(2)
    })
  })

  describe('spec example', () => {
    it('gives asIs 0.6 and active 1.5', () => {
      const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')
      expect(result.asIs).toEqual({
        value: 0.6,
        basis: '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
      })
      expect(result.active).toEqual({
        value: 1.5,
        basis: '3 dated completion(s) over 2 day(s) something completed',
      })
    })

    it('does not depend on input order', () => {
      const result = velocities(done('2026-01-03', '2026-01-01', '2026-01-01'), '2026-01-05')
      expect(result.asIs.value).toBe(0.6)
      expect(result.asIs.basis).toContain('since 2026-01-01')
      expect(result.active.value).toBe(1.5)
    })
  })

  describe('ignored completions', () => {
    it.each([
      ['null', null],
      ['a non-ISO format', '01/02/2026'],
      ['a missing zero pad', '2026-1-02'],
      ['a timestamp', '2026-01-02T00:00:00Z'],
      ['an empty string', ''],
      ['a non-existent day in February', '2026-02-31'],
      ['a day past the end of the month', '2026-08-32'],
      ['a non-leap-year Feb 29', '2026-02-29'],
      ['month 13', '2026-13-01'],
      ['month 00', '2026-00-10'],
      ['day 00', '2026-01-00'],
    ])('ignores %s', (_label, bad) => {
      const result = velocities(done('2026-01-01', '2026-01-02', '2026-01-02', bad), '2026-01-04')
      expect(result.asIs).toEqual({
        value: 3 / 4,
        basis: '3 dated completion(s) over 4 calendar day(s) since 2026-01-01, quiet days included',
      })
      expect(result.active).toEqual({
        value: 1.5,
        basis: '3 dated completion(s) over 2 day(s) something completed',
      })
    })

    it('does not count ignored completions towards the minimum of two', () => {
      expect(velocities(done('2026-01-01', null, '2026-02-31', 'garbage'), '2026-01-05')).toEqual(unmeasured)
    })

    it('accepts a real leap day', () => {
      const result = velocities(done('2024-02-28', '2024-02-29', '2024-03-01'), '2024-03-01')
      expect(result.asIs.value).toBe(1)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 3 calendar day(s) since 2024-02-28, quiet days included',
      )
    })
  })

  describe('era', () => {
    it('is one day when everything, including today, falls on the same date', () => {
      const result = velocities(done('2026-03-10', '2026-03-10', '2026-03-10'), '2026-03-10')
      expect(result.asIs).toEqual({
        value: 3,
        basis: '3 dated completion(s) over 1 calendar day(s) since 2026-03-10, quiet days included',
      })
      expect(result.active).toEqual({
        value: 3,
        basis: '3 dated completion(s) over 1 day(s) something completed',
      })
    })

    it('ends at the latest completion when it is after today', () => {
      const result = velocities(done('2026-01-01', '2026-01-05', '2026-01-10'), '2026-01-03')
      expect(result.asIs.value).toBe(3 / 10)
      expect(result.asIs.basis).toBe(
        '3 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
      )
    })

    it('ends at today when today is after the latest completion', () => {
      const result = velocities(done('2026-01-01', '2026-01-02', '2026-01-03'), '2026-01-30')
      expect(result.asIs.value).toBe(3 / 30)
      expect(result.asIs.basis).toContain('over 30 calendar day(s)')
    })

    it('counts across month and year boundaries', () => {
      const result = velocities(done('2025-12-30', '2026-01-02', '2026-03-01'), '2026-03-01')
      // Dec 30..31 (2) + Jan (31) + Feb (28) + Mar 1 (1) = 62
      expect(result.asIs.basis).toContain('over 62 calendar day(s) since 2025-12-30')
      expect(result.asIs.value).toBe(3 / 62)
    })

    it('counts whole days across a DST change', () => {
      const result = velocities(done('2026-03-01', '2026-03-15', '2026-04-01'), '2026-04-01')
      expect(result.asIs.basis).toContain('over 32 calendar day(s)')
    })
  })

  describe('active days', () => {
    it('counts distinct dates while every completion counts towards n', () => {
      const result = velocities(
        done('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-04', '2026-01-04', '2026-01-09'),
        '2026-01-10',
      )
      expect(result.active).toEqual({
        value: 2,
        basis: '6 dated completion(s) over 3 day(s) something completed',
      })
      expect(result.asIs).toEqual({
        value: 0.6,
        basis: '6 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
      })
    })
  })
})
