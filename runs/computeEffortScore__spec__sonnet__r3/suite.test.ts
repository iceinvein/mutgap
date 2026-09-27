import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(additions: number, deletions: number, path = 'a.ts'): PrFileEntry {
  return { path, additions, deletions }
}

function files(count: number, linesPerFile: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => file(linesPerFile, 0, `f${i}.ts`))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('scores at most 2 files and at most 50 lines as 1', () => {
    expect(computeEffortScore(files(2, 25))).toBe(1)
  })

  it('scores exactly the tier-1 boundary (2 files, 50 lines) as 1', () => {
    expect(computeEffortScore([file(30, 0), file(20, 0)])).toBe(1)
  })

  it('bumps to 2 when file count exceeds tier 1 but stays within tier 2', () => {
    expect(computeEffortScore(files(3, 1))).toBe(2)
  })

  it('bumps to 2 when line count exceeds tier 1 but stays within tier 2', () => {
    expect(computeEffortScore([file(51, 0)])).toBe(2)
  })

  it('scores exactly the tier-2 boundary (5 files, 200 lines) as 2', () => {
    expect(computeEffortScore(files(5, 40))).toBe(2)
  })

  it('scores exactly the tier-3 boundary (10 files, 500 lines) as 3', () => {
    expect(computeEffortScore(files(10, 50))).toBe(3)
  })

  it('scores a single file with 300 changed lines as 3', () => {
    expect(computeEffortScore([file(300, 0)])).toBe(3)
  })

  it('scores six files with one line each as 3', () => {
    expect(computeEffortScore(files(6, 1))).toBe(3)
  })

  it('scores exactly the tier-4 boundary (20 files, 1000 lines) as 4', () => {
    expect(computeEffortScore(files(20, 50))).toBe(4)
  })

  it('scores just past the tier-4 file limit as 5', () => {
    expect(computeEffortScore(files(21, 1))).toBe(5)
  })

  it('scores just past the tier-4 line limit as 5', () => {
    expect(computeEffortScore([file(1001, 0)])).toBe(5)
  })

  it('counts additions and deletions together toward the line total', () => {
    expect(computeEffortScore([file(30, 30)])).toBe(2)
  })

  it('requires both the file limit and the line limit to be met for a tier', () => {
    // Many files, few lines: file count forces a higher tier even though lines are tiny.
    expect(computeEffortScore(files(11, 1))).toBe(4)
    // Few files, many lines: line count forces a higher tier even though file count is tiny.
    expect(computeEffortScore([file(600, 0)])).toBe(4)
  })
})
