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

  it('returns null rates when only one dated completion exists', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: null },
      ],
      '2026-01-05',
    )
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('ignores completions with a null doneAt', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-03' },
        { fr: 'c', doneAt: null },
      ],
      '2026-01-03',
    )
    expect(result.asIs.value).toBe(2 / 3)
    expect(result.active.value).toBe(2 / 2)
  })

  it('ignores completions whose doneAt is not in YYYY-MM-DD form', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-03' },
        { fr: 'c', doneAt: '01/03/2026' },
        { fr: 'd', doneAt: '2026-1-3' },
      ],
      '2026-01-03',
    )
    expect(result.asIs.value).toBe(2 / 3)
    expect(result.active.value).toBe(2 / 2)
  })

  it('ignores completions naming a day that does not exist on the calendar', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-03' },
        { fr: 'c', doneAt: '2026-02-31' },
        { fr: 'd', doneAt: '2026-08-32' },
      ],
      '2026-01-03',
    )
    expect(result.asIs.value).toBe(2 / 3)
    expect(result.active.value).toBe(2 / 2)
  })

  it('exactly two dated completions are enough to measure a rate', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-03' },
      ],
      '2026-01-03',
    )
    expect(result.asIs.value).not.toBeNull()
    expect(result.active.value).not.toBeNull()
  })

  it('matches the worked example from the spec', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
        { fr: 'c', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result.asIs).toEqual({
      value: 0.6,
      basis: '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
    })
    expect(result.active).toEqual({
      value: 1.5,
      basis: '3 dated completion(s) over 2 day(s) something completed',
    })
  })

  it('counts several completions on the same date all towards n', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
        { fr: 'c', doneAt: '2026-01-01' },
      ],
      '2026-01-01',
    )
    expect(result.asIs.value).toBe(3)
    expect(result.active.value).toBe(3)
  })

  it('treats the era as inclusive, so starting and ending on the same day is 1 day', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-01' },
      ],
      '2026-01-01',
    )
    expect(result.asIs.basis).toContain('over 1 calendar day(s)')
  })

  it('extends the era to today when today is after the latest completion', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-02' },
      ],
      '2026-01-10',
    )
    expect(result.asIs.basis).toContain('over 10 calendar day(s)')
  })

  it('extends the era to the latest completion when it is after today', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-01' },
        { fr: 'b', doneAt: '2026-01-10' },
      ],
      '2026-01-02',
    )
    expect(result.asIs.basis).toContain('over 10 calendar day(s)')
    expect(result.asIs.basis).toContain('since 2026-01-01')
  })

  it('uses the earliest dated completion as the start of the era regardless of input order', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2026-01-05' },
        { fr: 'b', doneAt: '2026-01-01' },
        { fr: 'c', doneAt: '2026-01-03' },
      ],
      '2026-01-05',
    )
    expect(result.asIs.basis).toContain('since 2026-01-01')
  })
})
