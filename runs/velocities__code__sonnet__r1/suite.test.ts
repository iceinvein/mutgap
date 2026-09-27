import { describe, expect, it } from 'vitest'
import { velocities } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

describe('velocities', () => {
  it('returns unmeasured rates when there are no completions', () => {
    const result = velocities([], '2024-01-10')
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('returns unmeasured rates when no completions have a doneAt date', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: null },
        { fr: 'b', doneAt: null },
      ],
      '2024-01-10',
    )
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('ignores malformed or invalid calendar dates', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: 'not-a-date' },
        { fr: 'b', doneAt: '2024-13-40' },
        { fr: 'c', doneAt: '2024-02-30' },
      ],
      '2024-01-10',
    )
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('returns unmeasured rates when exactly two dated completions exist', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-01' },
        { fr: 'b', doneAt: '2024-01-02' },
      ],
      '2024-01-10',
    )
    expect(result).toEqual({
      asIs: { value: null, basis: UNMEASURED },
      active: { value: null, basis: UNMEASURED },
    })
  })

  it('computes rates over the span from first completion to today when today is later', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-01' },
        { fr: 'b', doneAt: '2024-01-02' },
        { fr: 'c', doneAt: '2024-01-03' },
      ],
      '2024-01-10',
    )
    // era: 2024-01-01..2024-01-10 inclusive = 10 days
    expect(result.asIs.value).toBeCloseTo(3 / 10)
    expect(result.asIs.basis).toBe('3 dated completion(s) over 10 calendar day(s) since 2024-01-01, quiet days included')
    // 3 distinct active days
    expect(result.active.value).toBeCloseTo(3 / 3)
    expect(result.active.basis).toBe('3 dated completion(s) over 3 day(s) something completed')
  })

  it('computes rates over the span up to the last completion when it is later than today', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-01' },
        { fr: 'b', doneAt: '2024-01-05' },
        { fr: 'c', doneAt: '2024-01-10' },
      ],
      '2024-01-02',
    )
    // era: 2024-01-01..2024-01-10 inclusive = 10 days
    expect(result.asIs.value).toBeCloseTo(3 / 10)
    expect(result.asIs.basis).toBe('3 dated completion(s) over 10 calendar day(s) since 2024-01-01, quiet days included')
  })

  it('counts duplicate-day completions once for active velocity but fully for as-is velocity', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-01' },
        { fr: 'b', doneAt: '2024-01-01' },
        { fr: 'c', doneAt: '2024-01-01' },
        { fr: 'd', doneAt: '2024-01-02' },
      ],
      '2024-01-02',
    )
    // era: 2024-01-01..2024-01-02 inclusive = 2 days
    expect(result.asIs.value).toBeCloseTo(4 / 2)
    // 2 distinct active days
    expect(result.active.value).toBeCloseTo(4 / 2)
    expect(result.active.basis).toBe('4 dated completion(s) over 2 day(s) something completed')
  })

  it('sorts unordered completions before computing the span', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-10' },
        { fr: 'b', doneAt: '2024-01-01' },
        { fr: 'c', doneAt: '2024-01-05' },
      ],
      '2024-01-10',
    )
    expect(result.asIs.basis).toContain('since 2024-01-01')
    expect(result.asIs.value).toBeCloseTo(3 / 10)
  })

  it('ignores undated completions mixed in with dated ones', () => {
    const result = velocities(
      [
        { fr: 'a', doneAt: '2024-01-01' },
        { fr: 'b', doneAt: null },
        { fr: 'c', doneAt: '2024-01-02' },
        { fr: 'd', doneAt: '2024-01-03' },
      ],
      '2024-01-03',
    )
    // era: 2024-01-01..2024-01-03 inclusive = 3 days, 3 dated completions
    expect(result.asIs.value).toBeCloseTo(3 / 3)
    expect(result.asIs.basis).toContain('3 dated completion(s)')
  })
})
