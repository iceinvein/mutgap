import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH_BASIS =
  'not enough dated completions to measure a rate; one point is not a rate'

const fr = (doneAt: string | null): Completion => ({ fr: 'FR-1', doneAt })

describe('velocities', () => {
  it('returns null rates when there are no dated completions', () => {
    const result = velocities([], '2026-01-05')
    expect(result.asIs).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
    expect(result.active).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
  })

  it('returns null rates when doneAt is null', () => {
    const result = velocities([fr(null), fr(null)], '2026-01-05')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('returns null rates when only one dated completion exists', () => {
    const result = velocities([fr('2026-01-01'), fr(null)], '2026-01-05')
    expect(result.asIs).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
    expect(result.active).toEqual({ value: null, basis: NOT_ENOUGH_BASIS })
  })

  it('ignores completions with malformed date strings', () => {
    const malformed = [
      fr('2026/01/01'),
      fr('01-01-2026'),
      fr('2026-1-1'),
      fr('2026-01-01T00:00:00'),
      fr('not-a-date'),
      fr(''),
    ]
    const result = velocities([...malformed, fr('2026-01-01')], '2026-01-05')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('ignores dates that do not name a real calendar day', () => {
    const invalid = [
      fr('2026-02-31'),
      fr('2026-08-32'),
      fr('2026-13-01'),
      fr('2026-00-10'),
      fr('2026-01-00'),
      fr('2023-02-29'), // not a leap year
    ]
    const result = velocities([...invalid, fr('2026-01-01')], '2026-01-05')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('accepts a valid leap day', () => {
    const result = velocities(
      [fr('2024-02-29'), fr('2024-03-01')],
      '2024-03-01',
    )
    expect(result.asIs.value).not.toBeNull()
    expect(result.active.value).not.toBeNull()
  })

  it('treats two or more dated completions as enough to measure', () => {
    const result = velocities([fr('2026-01-01'), fr('2026-01-02')], '2026-01-02')
    expect(result.asIs.value).not.toBeNull()
    expect(result.active.value).not.toBeNull()
  })

  it('matches the worked example from the spec', () => {
    const result = velocities(
      [fr('2026-01-01'), fr('2026-01-01'), fr('2026-01-03')],
      '2026-01-05',
    )
    expect(result.asIs).toEqual({
      value: 0.6,
      basis:
        '3 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included',
    })
    expect(result.active).toEqual({
      value: 1.5,
      basis: '3 dated completion(s) over 2 day(s) something completed',
    })
  })

  it('counts an era starting and ending on the same day as 1 day', () => {
    const result = velocities([fr('2026-01-01'), fr('2026-01-01')], '2026-01-01')
    expect(result.asIs).toEqual({
      value: 2,
      basis:
        '2 dated completion(s) over 1 calendar day(s) since 2026-01-01, quiet days included',
    })
    expect(result.active).toEqual({
      value: 2,
      basis: '2 dated completion(s) over 1 day(s) something completed',
    })
  })

  it('extends the era to today when today is later than the last completion', () => {
    const result = velocities([fr('2026-01-01'), fr('2026-01-02')], '2026-01-10')
    expect(result.asIs.basis).toBe(
      '2 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
    )
    expect(result.asIs.value).toBe(0.2)
  })

  it('extends the era to the latest completion when it is later than today', () => {
    const result = velocities([fr('2026-01-01'), fr('2026-01-10')], '2026-01-02')
    expect(result.asIs.basis).toBe(
      '2 dated completion(s) over 10 calendar day(s) since 2026-01-01, quiet days included',
    )
    expect(result.asIs.value).toBe(0.2)
  })

  it('ignores undated completions when computing the rates but still counts dated ones', () => {
    const result = velocities(
      [fr('2026-01-01'), fr(null), fr('2026-01-01'), fr('2026-02-31'), fr('2026-01-03')],
      '2026-01-05',
    )
    expect(result.asIs.value).toBe(0.6)
    expect(result.active.value).toBe(1.5)
  })
})
