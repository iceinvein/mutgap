import { describe, expect, it } from 'vitest'
import { velocities } from './velocities'

function completion(fr: string, doneAt: string | null) {
  return { fr, doneAt }
}

describe('velocities', () => {
  it('returns null rates when there are no dated completions', () => {
    const result = velocities([completion('a', null), completion('b', null)], '2024-01-10')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
    expect(result.asIs.basis).toMatch(/one point is not a rate/)
    expect(result.active.basis).toMatch(/one point is not a rate/)
  })

  it('returns null rates when there is exactly one dated completion', () => {
    const result = velocities([completion('a', '2024-01-01')], '2024-01-10')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('returns null rates when there are exactly two dated completions', () => {
    const result = velocities(
      [completion('a', '2024-01-01'), completion('b', '2024-01-02')],
      '2024-01-10',
    )
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('ignores completions with null doneAt and invalid calendar dates', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', null),
        completion('c', 'not-a-date'),
        completion('d', '2024-02-30'), // invalid calendar date
        completion('e', '2024-01-02'),
        completion('f', '2024-01-03'),
      ],
      '2024-01-03',
    )
    // Only a, e, f are valid dated completions -> 3 dates over 3 days
    expect(result.asIs.value).toBe(1)
    expect(result.active.value).toBe(1)
  })

  it('computes asIs rate over the calendar span including quiet days', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', '2024-01-01'),
        completion('c', '2024-01-05'),
      ],
      '2024-01-05',
    )
    // span from 2024-01-01 to 2024-01-05 inclusive = 5 days, 3 completions
    expect(result.asIs.value).toBe(3 / 5)
    expect(result.asIs.basis).toContain('3 dated completion(s) over 5 calendar day(s) since 2024-01-01')
  })

  it('computes active rate over only the days something completed', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', '2024-01-01'),
        completion('c', '2024-01-05'),
      ],
      '2024-01-05',
    )
    // 2 distinct active days (01-01 and 01-05), 3 completions
    expect(result.active.value).toBe(3 / 2)
    expect(result.active.basis).toContain('3 dated completion(s) over 2 day(s) something completed')
  })

  it('extends the era to today when today is after the last completion', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', '2024-01-02'),
        completion('c', '2024-01-03'),
      ],
      '2024-01-10',
    )
    // span from 2024-01-01 to 2024-01-10 inclusive = 10 days
    expect(result.asIs.value).toBe(3 / 10)
    expect(result.asIs.basis).toContain('over 10 calendar day(s)')
  })

  it('uses the last completion date as the era end when it is after today', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', '2024-01-02'),
        completion('c', '2024-01-10'),
      ],
      '2024-01-03',
    )
    // last completion (01-10) is after today (01-03), so span extends to 01-10
    // 2024-01-01 to 2024-01-10 inclusive = 10 days
    expect(result.asIs.value).toBe(3 / 10)
  })

  it('sorts dates before computing the span regardless of input order', () => {
    const result = velocities(
      [
        completion('a', '2024-01-05'),
        completion('b', '2024-01-01'),
        completion('c', '2024-01-03'),
      ],
      '2024-01-05',
    )
    expect(result.asIs.value).toBe(3 / 5)
    expect(result.asIs.basis).toContain('since 2024-01-01')
  })

  it('counts repeated dates once for the active day count', () => {
    const result = velocities(
      [
        completion('a', '2024-01-01'),
        completion('b', '2024-01-01'),
        completion('c', '2024-01-01'),
        completion('d', '2024-01-01'),
      ],
      '2024-01-01',
    )
    expect(result.active.value).toBe(4 / 1)
    expect(result.asIs.value).toBe(4 / 1)
  })
})
