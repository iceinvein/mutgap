import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(additions: number, deletions: number, path = 'a.ts'): PrFileEntry {
  return { path, additions, deletions }
}

function files(count: number, linesEach: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => file(linesEach, 0, `f${i}.ts`))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('scores 1 at the exact boundary of tier 1 (2 files, 50 lines)', () => {
    expect(computeEffortScore([file(25, 0), file(0, 25)])).toBe(1)
  })

  it('scores 2 when files exceed tier 1 but lines do not', () => {
    expect(computeEffortScore(files(3, 1))).toBe(2)
  })

  it('scores 2 when lines exceed tier 1 but files do not', () => {
    expect(computeEffortScore([file(51, 0)])).toBe(2)
  })

  it('scores 2 at the exact boundary of tier 2 (5 files, 200 lines)', () => {
    expect(computeEffortScore(files(5, 40))).toBe(2)
  })

  it('scores 3 when a single file has 300 changed lines', () => {
    expect(computeEffortScore([file(150, 150)])).toBe(3)
  })

  it('scores 3 when six files have one line each', () => {
    expect(computeEffortScore(files(6, 1))).toBe(3)
  })

  it('scores 3 at the exact boundary of tier 3 (10 files, 500 lines)', () => {
    expect(computeEffortScore(files(10, 50))).toBe(3)
  })

  it('scores 4 when just over tier 3 file limit', () => {
    expect(computeEffortScore(files(11, 1))).toBe(4)
  })

  it('scores 4 when just over tier 3 line limit', () => {
    expect(computeEffortScore([file(501, 0)])).toBe(4)
  })

  it('scores 4 at the exact boundary of tier 4 (20 files, 1000 lines)', () => {
    expect(computeEffortScore(files(20, 50))).toBe(4)
  })

  it('scores 5 when just over tier 4 file limit', () => {
    expect(computeEffortScore(files(21, 1))).toBe(5)
  })

  it('scores 5 when just over tier 4 line limit', () => {
    expect(computeEffortScore([file(1001, 0)])).toBe(5)
  })

  it('scores 5 for very large changes', () => {
    expect(computeEffortScore(files(100, 1000))).toBe(5)
  })

  it('counts additions plus deletions together toward the line total', () => {
    expect(computeEffortScore([file(30, 30)])).toBe(2)
  })
})
