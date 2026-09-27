import { describe, expect, it } from 'vitest'
import { velocities, type Completion } from './velocities'

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

function completion(fr: string, doneAt: string | null): Completion {
  return { fr, doneAt }
}

describe('velocities', () => {
  it('returns unmeasured when there are no completions', () => {
    const result = velocities([], '2024-01-10')
    expect(result.asIs).toEqual({ value: null, basis: UNMEASURED })
    expect(result.active).toEqual({ value: null, basis: UNMEASURED })
  })

  it('ignores completions with a null doneAt', () => {
    const completions = [completion('a', null), completion('b', null), completion('c', '2024-01-01')]
    const result = velocities(completions, '2024-01-10')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('ignores completions with malformed or invalid dates', () => {
    const completions = [
      completion('a', 'not-a-date'),
      completion('b', '2024/01/01'),
      completion('c', '2024-02-30'), // invalid calendar date
      completion('d', '2024-01-01'),
    ]
    const result = velocities(completions, '2024-01-10')
    expect(result.asIs.value).toBeNull()
    expect(result.active.value).toBeNull()
  })

  it('treats exactly two dated completions as unmeasured (boundary)', () => {
    const completions = [completion('a', '2024-01-01'), completion('b', '2024-01-05')]
    const result = velocities(completions, '2024-01-10')
    expect(result.asIs).toEqual({ value: null, basis: UNMEASURED })
    expect(result.active).toEqual({ value: null, basis: UNMEASURED })
  })

  it('measures a rate once there are three or more dated completions', () => {
    const completions = [
      completion('a', '2024-01-01'),
      completion('b', '2024-01-03'),
      completion('c', '2024-01-05'),
    ]
    const result = velocities(completions, '2024-01-05')
    // first=2024-01-01, last=2024-01-05, today=2024-01-05 -> end=last, eraDays = 5
    expect(result.asIs.value).toBe(3 / 5)
    expect(result.asIs.basis).toBe('3 dated completion(s) over 5 calendar day(s) since 2024-01-01, quiet days included')
    // 3 distinct active days
    expect(result.active.value).toBe(3 / 3)
    expect(result.active.basis).toBe('3 dated completion(s) over 3 day(s) something completed')
  })

  it('extends the era to today when today is after the last completion', () => {
    const completions = [
      completion('a', '2024-01-01'),
      completion('b', '2024-01-02'),
      completion('c', '2024-01-03'),
    ]
    const result = velocities(completions, '2024-01-10')
    // eraDays from 2024-01-01 to 2024-01-10 inclusive = 10
    expect(result.asIs.value).toBe(3 / 10)
    expect(result.asIs.basis).toContain('over 10 calendar day(s)')
  })

  it('uses the last completion date when it is after today', () => {
    const completions = [
      completion('a', '2024-01-01'),
      completion('b', '2024-01-05'),
      completion('c', '2024-01-10'),
    ]
    const result = velocities(completions, '2024-01-02')
    // eraDays from 2024-01-01 to 2024-01-10 inclusive = 10
    expect(result.asIs.value).toBe(3 / 10)
    expect(result.asIs.basis).toContain('over 10 calendar day(s)')
  })

  it('counts multiple completions on the same day once for the active rate', () => {
    const completions = [
      completion('a', '2024-01-01'),
      completion('b', '2024-01-01'),
      completion('c', '2024-01-01'),
      completion('d', '2024-01-03'),
    ]
    const result = velocities(completions, '2024-01-03')
    // 4 completions, 2 distinct active days
    expect(result.active.value).toBe(4 / 2)
    expect(result.active.basis).toBe('4 dated completion(s) over 2 day(s) something completed')
    // eraDays from 2024-01-01 to 2024-01-03 inclusive = 3
    expect(result.asIs.value).toBe(4 / 3)
  })

  it('sorts unordered completions before computing the era', () => {
    const completions = [
      completion('a', '2024-01-10'),
      completion('b', '2024-01-01'),
      completion('c', '2024-01-05'),
    ]
    const result = velocities(completions, '2024-01-10')
    expect(result.asIs.basis).toContain('since 2024-01-01')
    expect(result.asIs.value).toBe(3 / 10)
  })
})
