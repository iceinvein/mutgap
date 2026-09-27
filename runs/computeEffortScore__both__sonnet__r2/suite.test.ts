import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(additions: number, deletions: number, path = 'f.ts'): PrFileEntry {
  return { path, additions, deletions }
}

function files(count: number, linesEach: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => file(linesEach, 0, `f${i}.ts`))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('scores 1 when within the tier-1 limits', () => {
    expect(computeEffortScore([file(10, 5)])).toBe(1)
    expect(computeEffortScore(files(2, 10))).toBe(1)
  })

  it('scores 1 at the exact tier-1 boundary (2 files, 50 lines)', () => {
    expect(computeEffortScore(files(2, 25))).toBe(1)
  })

  it('scores 2 when file count exceeds tier 1 but not tier 2', () => {
    expect(computeEffortScore(files(3, 1))).toBe(2)
  })

  it('scores 2 when line count exceeds tier 1 but not tier 2', () => {
    expect(computeEffortScore([file(51, 0)])).toBe(2)
  })

  it('scores 2 at the exact tier-2 boundary (5 files, 200 lines)', () => {
    expect(computeEffortScore(files(5, 40))).toBe(2)
  })

  it('scores 3 when a single file has 300 changed lines', () => {
    expect(computeEffortScore([file(300, 0)])).toBe(3)
  })

  it('scores 3 when six files have one line each', () => {
    expect(computeEffortScore(files(6, 1))).toBe(3)
  })

  it('scores 3 at the exact tier-3 boundary (10 files, 500 lines)', () => {
    expect(computeEffortScore(files(10, 50))).toBe(3)
  })

  it('scores 4 at the exact tier-4 boundary (20 files, 1000 lines)', () => {
    expect(computeEffortScore(files(20, 50))).toBe(4)
  })

  it('scores 4 when just over the tier-3 limits', () => {
    expect(computeEffortScore(files(11, 1))).toBe(4)
    expect(computeEffortScore([file(501, 0)])).toBe(4)
  })

  it('scores 5 when file count exceeds tier 4', () => {
    expect(computeEffortScore(files(21, 1))).toBe(5)
  })

  it('scores 5 when line count exceeds tier 4', () => {
    expect(computeEffortScore([file(1001, 0)])).toBe(5)
  })

  it('counts additions plus deletions across all files toward the line total', () => {
    expect(computeEffortScore([file(20, 20), file(5, 5)])).toBe(1)
    expect(computeEffortScore([file(20, 20), file(6, 5)])).toBe(2)
  })

  it('requires both limits to hold, not just one', () => {
    // many files, few lines each: file count alone pushes the tier up
    expect(computeEffortScore(files(3, 1))).toBe(2)
    // few files, many lines: line count alone pushes the tier up
    expect(computeEffortScore([file(60, 0)])).toBe(2)
  })
})
