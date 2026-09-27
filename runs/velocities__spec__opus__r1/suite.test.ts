import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH = 'not enough dated completions to measure a rate; one point is not a rate'

const c = (doneAt: string | null, fr = 'FR-1'): Completion => ({ fr, doneAt })
const at = (...dates: (string | null)[]): Completion[] => dates.map((d, i) => c(d, `FR-${i + 1}`))

// The spec writes "completion(s)" / "day(s)"; accept either the literal "(s)" or
// correct pluralisation so the tests pin the numbers and wording, not that choice.
const s = (word: string) => `${word}(?:\\(s\\)|s)?`
const asIsBasis = (n: number, eraDays: number, first: string) =>
  new RegExp(
    `^${n} dated ${s('completion')} over ${eraDays} calendar ${s('day')} since ${first}, quiet days included$`,
  )
const activeBasis = (n: number, activeDays: number) =>
  new RegExp(`^${n} dated ${s('completion')} over ${activeDays} ${s('day')} something completed$`)

function expectNotEnough(result: ReturnType<typeof velocities>) {
  expect(result).toEqual({
    asIs: { value: null, basis: NOT_ENOUGH },
    active: { value: null, basis: NOT_ENOUGH },
  })
}

describe('velocities', () => {
  describe('the worked example from the spec', () => {
    const example = () => velocities(at('2026-01-01', '2026-01-01', '2026-01-03'), '2026-01-05')

    it('gives asIs of 0.6 over a 5-day era', () => {
      const result = example()
      expect(result.asIs.value).toBeCloseTo(0.6, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(3, 5, '2026-01-01'))
    })

    it('gives active of 1.5 over 2 active days', () => {
      const result = example()
      expect(result.active.value).toBeCloseTo(1.5, 10)
      expect(result.active.basis).toMatch(activeBasis(3, 2))
    })
  })

  describe('not enough dated completions', () => {
    it('returns null rates for no completions', () => {
      expectNotEnough(velocities([], '2026-01-05'))
    })

    it('returns null rates for a single dated completion', () => {
      expectNotEnough(velocities(at('2026-01-01'), '2026-01-05'))
    })

    it('returns null rates when only one completion is dated', () => {
      expectNotEnough(velocities(at(null, '2026-01-01', null), '2026-01-05'))
    })

    it('returns null rates when every completion is undated or invalid', () => {
      expectNotEnough(velocities(at(null, 'yesterday', '2026-02-31'), '2026-03-05'))
    })

    it('returns null rates when one valid and one invalid date remain', () => {
      expectNotEnough(velocities(at('2026-01-01', '2026-01-32'), '2026-01-05'))
    })
  })

  describe('exactly two dated completions is enough', () => {
    it('measures with two completions on different days', () => {
      const result = velocities(at('2026-01-01', '2026-01-02'), '2026-01-02')
      expect(result.asIs.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2026-01-01'))
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.active.basis).toMatch(activeBasis(2, 2))
    })

    it('measures with two completions on the same day as today (1-day era)', () => {
      const result = velocities(at('2026-01-01', '2026-01-01'), '2026-01-01')
      expect(result.asIs.value).toBeCloseTo(2, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 1, '2026-01-01'))
      expect(result.active.value).toBeCloseTo(2, 10)
      expect(result.active.basis).toMatch(activeBasis(2, 1))
    })
  })

  describe('filtering of doneAt', () => {
    const invalid = [
      ['null', null],
      ['empty string', ''],
      ['not a date', 'yesterday'],
      ['single-digit month', '2026-1-03'],
      ['single-digit day', '2026-01-3'],
      ['no separators', '20260103'],
      ['slashes', '2026/01/03'],
      ['day-first order', '03-01-2026'],
      ['with a time', '2026-01-03T00:00:00Z'],
      ['with a space and time', '2026-01-03 10:00'],
      ['leading whitespace', ' 2026-01-03'],
      ['trailing whitespace', '2026-01-03 '],
      ['two-digit year', '26-01-03'],
      ['month 00', '2026-00-03'],
      ['month 13', '2026-13-03'],
      ['day 00', '2026-01-00'],
      ['day 32', '2026-08-32'],
      ['31 February', '2026-02-31'],
      ['30 February', '2026-02-30'],
      ['29 February in a non-leap year', '2026-02-29'],
      ['29 February in a century non-leap year', '2100-02-29'],
      ['31 April', '2026-04-31'],
      ['31 June', '2026-06-31'],
      ['31 September', '2026-09-31'],
      ['31 November', '2026-11-31'],
    ] as const

    it.each(invalid)('ignores a doneAt that is %s', (_label, bad) => {
      // Two good completions plus the bad one: the bad one must not affect n,
      // the era start, or the active day count.
      const result = velocities(at('2026-01-05', bad, '2026-01-06'), '2026-01-06')
      expect(result.asIs.value).toBeCloseTo(1, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2026-01-05'))
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.active.basis).toMatch(activeBasis(2, 2))
    })

    it('ignores an invalid date that would otherwise be the earliest', () => {
      const result = velocities(at('2025-13-01', '2026-01-05', '2026-01-06'), '2026-01-06')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2026-01-05'))
    })

    const valid = [
      ['29 February in a leap year', '2024-02-29'],
      ['29 February in a 400-year leap year', '2000-02-29'],
      ['31 December', '2025-12-31'],
      ['31 January', '2026-01-31'],
      ['30 April', '2026-04-30'],
    ] as const

    it.each(valid)('counts a doneAt that is %s', (_label, good) => {
      const result = velocities(at(good, good), good)
      expect(result.asIs.value).toBeCloseTo(2, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 1, good))
      expect(result.active.basis).toMatch(activeBasis(2, 1))
    })
  })

  describe('the era', () => {
    it('starts at the earliest dated completion regardless of input order', () => {
      const result = velocities(at('2026-01-10', '2026-01-01', '2026-01-05'), '2026-01-10')
      expect(result.asIs.value).toBeCloseTo(3 / 10, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(3, 10, '2026-01-01'))
    })

    it('extends to today when today is after the latest completion', () => {
      const result = velocities(at('2026-01-01', '2026-01-02'), '2026-01-20')
      expect(result.asIs.value).toBeCloseTo(2 / 20, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 20, '2026-01-01'))
    })

    it('extends to the latest completion when it is after today', () => {
      const result = velocities(at('2026-01-01', '2026-01-10'), '2026-01-05')
      expect(result.asIs.value).toBeCloseTo(2 / 10, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 10, '2026-01-01'))
    })

    it('uses the latest completion when all completions are after today', () => {
      const result = velocities(at('2026-02-01', '2026-02-04'), '2026-01-01')
      expect(result.asIs.value).toBeCloseTo(2 / 4, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 4, '2026-02-01'))
    })

    it('counts across a month boundary', () => {
      const result = velocities(at('2026-01-30', '2026-02-02'), '2026-02-02')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 4, '2026-01-30'))
    })

    it('counts across a year boundary', () => {
      const result = velocities(at('2025-12-31', '2026-01-01'), '2026-01-01')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2025-12-31'))
    })

    it('includes 29 February in a leap year', () => {
      const result = velocities(at('2024-02-28', '2024-03-01'), '2024-03-01')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 3, '2024-02-28'))
    })

    it('has no 29 February in a non-leap year', () => {
      const result = velocities(at('2026-02-28', '2026-03-01'), '2026-03-01')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2026-02-28'))
    })

    it('counts whole days across daylight-saving changes', () => {
      // Spans both northern (Mar/Oct-Nov) and southern (Apr/Oct) DST transitions.
      const result = velocities(at('2026-01-01', '2026-12-31'), '2026-12-31')
      expect(result.asIs.value).toBeCloseTo(2 / 365, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(2, 365, '2026-01-01'))
    })

    it('counts a full leap year as 366 days', () => {
      const result = velocities(at('2024-01-01', '2024-12-31'), '2024-12-31')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 366, '2024-01-01'))
    })

    it('does not start the era at an undated completion', () => {
      const result = velocities(at(null, '2026-01-03', '2026-01-04'), '2026-01-04')
      expect(result.asIs.basis).toMatch(asIsBasis(2, 2, '2026-01-03'))
    })
  })

  describe('active rate', () => {
    it('counts every completion on a shared date towards n', () => {
      const result = velocities(at('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-02'), '2026-01-02')
      expect(result.active.value).toBeCloseTo(4 / 2, 10)
      expect(result.active.basis).toMatch(activeBasis(4, 2))
      expect(result.asIs.value).toBeCloseTo(4 / 2, 10)
      expect(result.asIs.basis).toMatch(asIsBasis(4, 2, '2026-01-01'))
    })

    it('counts distinct dates only, ignoring quiet days', () => {
      const result = velocities(at('2026-01-01', '2026-01-15', '2026-01-31'), '2026-01-31')
      expect(result.active.value).toBeCloseTo(1, 10)
      expect(result.active.basis).toMatch(activeBasis(3, 3))
      expect(result.asIs.value).toBeCloseTo(3 / 31, 10)
    })

    it('does not count today as an active day', () => {
      const result = velocities(at('2026-01-01', '2026-01-02'), '2026-01-10')
      expect(result.active.basis).toMatch(activeBasis(2, 2))
    })

    it('does not count invalid dates as active days', () => {
      const result = velocities(at('2026-01-01', '2026-01-01', '2026-02-30', null), '2026-01-01')
      expect(result.active.value).toBeCloseTo(2, 10)
      expect(result.active.basis).toMatch(activeBasis(2, 1))
    })

    it('is unaffected by duplicate fr ids', () => {
      const result = velocities([c('2026-01-01', 'X'), c('2026-01-02', 'X')], '2026-01-02')
      expect(result.active.basis).toMatch(activeBasis(2, 2))
    })
  })

  it('does not mutate its input', () => {
    const input = at('2026-01-03', null, '2026-01-01')
    const snapshot = structuredClone(input)
    velocities(input, '2026-01-05')
    expect(input).toEqual(snapshot)
  })
})
