import { describe, expect, it } from 'vitest'
import { velocities } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

describe('velocities', () => {
  it('returns null rates when there are no dated completions', () => {
    const result = velocities([], '2026-01-05')
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('returns null rates when there is only one dated completion', () => {
    const result = velocities([{ fr: 'a', doneAt: '2026-01-01' }], '2026-01-05')
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('measures a rate from exactly two dated completions', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result.asIs.value).toBe(2 / 5)
    expect(result.active.value).toBe(2 / 2)
  })

  it('ignores completions with a null doneAt', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: null },
        { fr: 'b', doneAt: '2026-01-01' },
      ],
      '2026-01-05',
    )
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('ignores completions whose doneAt is not in YYYY-MM-DD form', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026/01/01' },
        { fr: 'b', doneAt: 'not a date' },
        { fr: 'c', doneAt: '2026-01-01' },
        { fr: 'd', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result.asIs.value).toBe(2 / 5)
  })

  it('ignores completions that do not name a real calendar day', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-02-31' },
        { fr: 'b', doneAt: '2026-08-32' },
        { fr: 'c', doneAt: '2026-01-01' },
        { fr: 'd', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result.asIs.value).toBe(2 / 5)
  })

  it('computes the rates for the worked example from the spec', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
        { fr: 'c', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result).toEqual({
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

  it('extends the era to today when today is after the latest completion', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-02' },
      ],
      '2026-01-10',
    )
    expect(result.asIs.basis).toBe(
      '2 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
    )
  })

  it('uses the latest completion as the era end when it is after today', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-10' },
      ],
      '2026-01-02',
    )
    expect(result.asIs.basis).toBe(
      '2 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
    )
  })

  it('counts an era starting and ending on the same day as 1 day', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
      ],
      '2026-01-01',
    )
    expect(result.asIs.value).toBe(2 / 1)
    expect(result.asIs.basis).toBe(
      '2 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
    )
  })

  it('counts every dated completion towards n even when several share a date', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
        { fr: 'c', doneAt: '2026-01-01' },
        { fr: 'd', doneAt: '2026-01-02' },
      ],
      '2026-01-02',
    )
    expect(result.active.value).toBe(4 / 2)
    expect(result.active.basis).toBe('4 dated completion(s) over 2 day(s) something completed')
  })
})
