import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH = 'not enough dated completions to measure a rate; one point is not a rate'

const done = (...dates: (string | null)[]): Completion[] =>
  dates.map((doneAt, i) => ({ fr: `FR-${i + 1}`, doneAt }))

const asIsBasis = (n: number, eraDays: number, first: string) =>
  `${n} dated completion(s) over ${eraDays} calendar day(s) since ${first}, quiet days included`

const activeBasis = (n: number, activeDays: number) =>
  `${n} dated completion(s) over ${activeDays} day(s) something completed`

describe('velocities', () => {
  describe('not enough dated completions', () => {
    const notEnough = { asIs: { value: null, basis: NOT_ENOUGH }, active: { value: null, basis: NOT_ENOUGH } }

    it('returns null rates for no completions', () => {
      expect(velocities([], '2026-01-05')).toEqual(notEnough)
    })

    it('returns null rates for a single dated completion', () => {
      expect(velocities(done('2026-01-01'), '2026-01-05')).toEqual(notEnough)
    })

    it('returns null rates when only undated completions exist', () => {
      expect(velocities(done(null, null, null), '2026-01-05')).toEqual(notEnough)
    })

    it('returns null rates when only one completion survives filtering', () => {
      expect(velocities(done('2026-01-01', null, '2026-02-31', 'nope'), '2026-01-05')).toEqual(notEnough)
    })
  })

  describe('spec example', () => {
    it('measures both rates for 01-01, 01-01, 01-03 with today 01-05', () => {
      const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(0.6, 10)
      expect(result.asIs.basis).toBe(asIsBasis(3, 5, '2026-01-01'))
      expect(result.active.value).toBeCloseTo(1.5, 10)
      expect(result.active.basis).toBe(activeBasis(3, 2))
    })
  })

  describe('measuring', () => {
    it('measures with exactly two dated completions', () => {
      const result = velocities(done('2026-01-01', '2026-01-02'), '2026-01-02')
      expect(result).toEqual({
        asIs: { value: 1, basis: asIsBasis(2, 2, '2026-01-01') },
        active: { value: 1, basis: activeBasis(2, 2) },
      })
    })

    it('counts an era that starts and ends on the same day as 1 day', () => {
      const result = velocities(done('2026-01-01', '2026-01-01'), '2026-01-01')
      expect(result).toEqual({
        asIs: { value: 2, basis: asIsBasis(2, 1, '2026-01-01') },
        active: { value: 2, basis: activeBasis(2, 1) },
      })
    })

    it('counts every completion on a shared date towards n', () => {
      const result = velocities(done('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-01'), '2026-01-04')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(4, 4, '2026-01-01') })
      expect(result.active).toEqual({ value: 4, basis: activeBasis(4, 1) })
    })

    it('uses the earliest dated completion as the era start regardless of input order', () => {
      const result = velocities(done('2026-01-10', '2026-01-03', '2026-01-07'), '2026-01-12')
      expect(result.asIs.basis).toBe(asIsBasis(3, 10, '2026-01-03'))
      expect(result.asIs.value).toBeCloseTo(0.3, 10)
      expect(result.active).toEqual({ value: 1, basis: activeBasis(3, 3) })
    })

    it('ends the era at the latest completion when it is after today', () => {
      const result = velocities(done('2026-01-01', '2026-01-10'), '2026-01-05')
      expect(result.asIs).toEqual({ value: 0.2, basis: asIsBasis(2, 10, '2026-01-01') })
    })

    it('ends the era at the latest completion when today is before every completion', () => {
      const result = velocities(done('2026-01-05', '2026-01-08'), '2026-01-01')
      expect(result.asIs).toEqual({ value: 0.5, basis: asIsBasis(2, 4, '2026-01-05') })
    })

    it('ends the era at today when today is after the latest completion', () => {
      const result = velocities(done('2026-01-01', '2026-01-02'), '2026-01-20')
      expect(result.asIs).toEqual({ value: 0.1, basis: asIsBasis(2, 20, '2026-01-01') })
    })

    it('does not let the active rate depend on today', () => {
      const early = velocities(done('2026-01-01', '2026-01-02', '2026-01-02'), '2026-01-02')
      const late = velocities(done('2026-01-01', '2026-01-02', '2026-01-02'), '2026-12-31')
      expect(early.active).toEqual({ value: 1.5, basis: activeBasis(3, 2) })
      expect(late.active).toEqual(early.active)
    })

    it('counts eras across month boundaries', () => {
      const result = velocities(done('2026-01-30', '2026-02-02'), '2026-02-02')
      expect(result.asIs).toEqual({ value: 0.5, basis: asIsBasis(2, 4, '2026-01-30') })
    })

    it('counts eras across year boundaries', () => {
      const result = velocities(done('2025-12-31', '2026-01-01'), '2026-01-01')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2025-12-31') })
    })

    it('counts whole calendar days across daylight-saving transitions', () => {
      const spring = velocities(done('2026-03-01', '2026-03-31'), '2026-03-31')
      expect(spring.asIs.basis).toBe(asIsBasis(2, 31, '2026-03-01'))
      const autumn = velocities(done('2026-10-01', '2026-11-30'), '2026-11-30')
      expect(autumn.asIs.basis).toBe(asIsBasis(2, 61, '2026-10-01'))
    })

    it('counts a full non-leap year and a full leap year', () => {
      expect(velocities(done('2026-01-01', '2026-12-31'), '2026-12-31').asIs.basis).toBe(
        asIsBasis(2, 365, '2026-01-01'),
      )
      expect(velocities(done('2024-01-01', '2024-12-31'), '2024-12-31').asIs.basis).toBe(
        asIsBasis(2, 366, '2024-01-01'),
      )
    })
  })

  describe('ignoring undated or invalid completions', () => {
    it('ignores null doneAt', () => {
      const result = velocities(done(null, '2026-01-01', null, '2026-01-02'), '2026-01-02')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2026-01-01') })
      expect(result.active).toEqual({ value: 1, basis: activeBasis(2, 2) })
    })

    it.each([
      ['2026-1-01'],
      ['2026-01-1'],
      ['26-01-01'],
      ['20260101'],
      ['2026/01/01'],
      ['2026-01-01T00:00:00Z'],
      [' 2026-01-01'],
      ['2026-01-01 '],
      [''],
      ['not a date'],
    ])('ignores malformed date %j', (bad) => {
      const result = velocities(done(bad, '2026-01-10', '2026-01-11'), '2026-01-11')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2026-01-10') })
      expect(result.active).toEqual({ value: 1, basis: activeBasis(2, 2) })
    })

    it.each([
      ['2026-02-31'],
      ['2026-02-29'],
      ['2026-04-31'],
      ['2026-08-32'],
      ['2026-13-01'],
      ['2026-00-10'],
      ['2026-01-00'],
    ])('ignores non-existent calendar day %s', (bad) => {
      const result = velocities(done(bad, '2026-01-10', '2026-01-11'), '2026-01-11')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2026-01-10') })
      expect(result.active).toEqual({ value: 1, basis: activeBasis(2, 2) })
    })

    it('accepts 29 February in a leap year', () => {
      const result = velocities(done('2024-02-28', '2024-02-29'), '2024-03-01')
      expect(result.asIs.basis).toBe(asIsBasis(2, 3, '2024-02-28'))
      expect(result.active).toEqual({ value: 1, basis: activeBasis(2, 2) })
    })

    it('does not let an ignored completion move the era start', () => {
      const result = velocities(done('2026-01-00', '2025-13-01', '2026-01-05', '2026-01-06'), '2026-01-06')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2026-01-05') })
    })

    it('does not let an ignored completion extend the era end', () => {
      const result = velocities(done('2026-01-01', '2026-01-02', '2026-12-32'), '2026-01-02')
      expect(result.asIs).toEqual({ value: 1, basis: asIsBasis(2, 2, '2026-01-01') })
    })
  })
})
