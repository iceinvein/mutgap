import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const NOT_ENOUGH_BASIS = 'not enough dated completions to measure a rate; one point is not a rate'

describe('velocities', () => {
  it('returns null rates when there are no completions at all', () => {
    const result = velocities([], '2026-01-01')
    expect(result).toEqual({
      asIs: { value: null, basis: NOT_ENOUGH_BASIS },
      active: { value: null, basis: NOT_ENOUGH_BASIS },
    })
  })

  it('returns null rates when there is only one dated completion', () => {
    const completions: Completion[] = [{ fr: 'FR-1', doneAt: '2026-01-01' }]
    const result = velocities(completions, '2026-01-01')
    expect(result).toEqual({
      asIs: { value: null, basis: NOT_ENOUGH_BASIS },
      active: { value: null, basis: NOT_ENOUGH_BASIS },
    })
  })

  it('returns null rates when all completions are undated', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: null },
      { fr: 'FR-2', doneAt: null },
    ]
    const result = velocities(completions, '2026-01-05')
    expect(result).toEqual({
      asIs: { value: null, basis: NOT_ENOUGH_BASIS },
      active: { value: null, basis: NOT_ENOUGH_BASIS },
    })
  })

  it('matches the worked example from the spec', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-01' },
      { fr: 'FR-2', doneAt: '2026-01-01' },
      { fr: 'FR-3', doneAt: '2026-01-03' },
    ]
    const result = velocities(completions, '2026-01-05')
    expect(result).toEqual({
      asIs: {
        value: 0.6,
        basis: '3 dated completions over 5 calendar days since 2026-01-01, quiet days included',
      },
      active: {
        value: 1.5,
        basis: '3 dated completions over 2 days something completed',
      },
    })
  })

  it('treats an era starting and ending on the same day as 1 day (singular basis)', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-01' },
      { fr: 'FR-2', doneAt: '2026-01-01' },
    ]
    const result = velocities(completions, '2026-01-01')
    expect(result).toEqual({
      asIs: {
        value: 2,
        basis: '2 dated completions over 1 calendar day since 2026-01-01, quiet days included',
      },
      active: {
        value: 2,
        basis: '2 dated completions over 1 day something completed',
      },
    })
  })

  it('extends the era to today when today is later than the latest completion', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-01' },
      { fr: 'FR-2', doneAt: '2026-01-01' },
    ]
    const result = velocities(completions, '2026-01-03')
    expect(result).toEqual({
      asIs: {
        value: 2 / 3,
        basis: '2 dated completions over 3 calendar days since 2026-01-01, quiet days included',
      },
      active: {
        value: 2,
        basis: '2 dated completions over 1 day something completed',
      },
    })
  })

  it('anchors the era on the latest completion when it is later than today', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-01' },
      { fr: 'FR-2', doneAt: '2026-01-10' },
    ]
    const result = velocities(completions, '2026-01-05')
    expect(result).toEqual({
      asIs: {
        value: 0.2,
        basis: '2 dated completions over 10 calendar days since 2026-01-01, quiet days included',
      },
      active: {
        value: 1,
        basis: '2 dated completions over 2 days something completed',
      },
    })
  })

  it('ignores completions with null, malformed, or non-existent dates', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-01' },
      { fr: 'FR-2', doneAt: '2026-01-01' },
      { fr: 'FR-3', doneAt: null },
      { fr: 'FR-4', doneAt: 'not-a-date' },
      { fr: 'FR-5', doneAt: '2026/01/01' },
      { fr: 'FR-6', doneAt: '2026-02-31' },
      { fr: 'FR-7', doneAt: '2026-08-32' },
      { fr: 'FR-8', doneAt: '2026-13-01' },
      { fr: 'FR-9', doneAt: '2026-00-10' },
    ]
    const result = velocities(completions, '2026-01-01')
    expect(result).toEqual({
      asIs: {
        value: 2,
        basis: '2 dated completions over 1 calendar day since 2026-01-01, quiet days included',
      },
      active: {
        value: 2,
        basis: '2 dated completions over 1 day something completed',
      },
    })
  })

  it('rejects Feb 29 on a non-leap year but accepts it on a leap year', () => {
    const nonLeap: Completion[] = [
      { fr: 'FR-1', doneAt: '2023-02-28' },
      { fr: 'FR-2', doneAt: '2023-02-29' },
    ]
    expect(velocities(nonLeap, '2023-02-28')).toEqual({
      asIs: { value: null, basis: NOT_ENOUGH_BASIS },
      active: { value: null, basis: NOT_ENOUGH_BASIS },
    })

    const leap: Completion[] = [
      { fr: 'FR-1', doneAt: '2024-02-28' },
      { fr: 'FR-2', doneAt: '2024-02-29' },
    ]
    expect(velocities(leap, '2024-02-29')).toEqual({
      asIs: {
        value: 1,
        basis: '2 dated completions over 2 calendar days since 2024-02-28, quiet days included',
      },
      active: {
        value: 1,
        basis: '2 dated completions over 2 days something completed',
      },
    })
  })

  it('finds the earliest and latest dates regardless of input order', () => {
    const completions: Completion[] = [
      { fr: 'FR-1', doneAt: '2026-01-10' },
      { fr: 'FR-2', doneAt: '2026-01-01' },
      { fr: 'FR-3', doneAt: '2026-01-05' },
    ]
    const result = velocities(completions, '2026-01-05')
    expect(result).toEqual({
      asIs: {
        value: 0.3,
        basis: '3 dated completions over 10 calendar days since 2026-01-01, quiet days included',
      },
      active: {
        value: 1,
        basis: '3 dated completions over 3 days something completed',
      },
    })
  })
})
