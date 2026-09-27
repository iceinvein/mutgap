import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(additions: number, deletions: number, path = 'file.ts'): PrFileEntry {
  return { path, additions, deletions }
}

describe('computeEffortScore', () => {
  it('returns 1 for no files', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('returns 1 for a small change (few files, few lines)', () => {
    expect(computeEffortScore([file(10, 5)])).toBe(1)
  })

  it('returns 1 at the boundary of files.length <= 2 and lines < 50', () => {
    expect(computeEffortScore([file(20, 0), file(20, 9)])).toBe(1)
  })

  it('returns 2 when line count reaches the tier-1 boundary (50 lines)', () => {
    expect(computeEffortScore([file(25, 0), file(25, 0)])).toBe(2)
  })

  it('returns 2 when file count exceeds tier-1 but stays within tier-2 bounds', () => {
    expect(computeEffortScore([file(1, 0), file(1, 0), file(1, 0)])).toBe(2)
  })

  it('returns 2 at the boundary of files.length <= 5 and lines <= 200', () => {
    expect(
      computeEffortScore([file(40, 0), file(40, 0), file(40, 0), file(40, 0), file(40, 0)])
    ).toBe(2)
  })

  it('returns 3 when lines exceed tier-2 bound by one', () => {
    expect(computeEffortScore([file(201, 0)])).toBe(3)
  })

  it('returns 3 when file count exceeds tier-2 but stays within tier-3 bounds', () => {
    const files = Array.from({ length: 6 }, () => file(1, 0))
    expect(computeEffortScore(files)).toBe(3)
  })

  it('returns 3 at the boundary of files.length <= 10 and lines <= 500', () => {
    const files = Array.from({ length: 10 }, () => file(50, 0))
    expect(computeEffortScore(files)).toBe(3)
  })

  it('returns 4 when lines exceed tier-3 bound by one', () => {
    expect(computeEffortScore([file(501, 0)])).toBe(4)
  })

  it('returns 4 when file count exceeds tier-3 but stays within tier-4 bounds', () => {
    const files = Array.from({ length: 11 }, () => file(1, 0))
    expect(computeEffortScore(files)).toBe(4)
  })

  it('returns 4 at the boundary of files.length <= 20 and lines <= 1000', () => {
    const files = Array.from({ length: 20 }, () => file(50, 0))
    expect(computeEffortScore(files)).toBe(4)
  })

  it('returns 5 when lines exceed tier-4 bound by one', () => {
    expect(computeEffortScore([file(1001, 0)])).toBe(5)
  })

  it('returns 5 when file count exceeds tier-4 bound', () => {
    const files = Array.from({ length: 21 }, () => file(1, 0))
    expect(computeEffortScore(files)).toBe(5)
  })

  it('counts both additions and deletions toward the line total', () => {
    expect(computeEffortScore([file(0, 60)])).toBe(2)
  })
})
