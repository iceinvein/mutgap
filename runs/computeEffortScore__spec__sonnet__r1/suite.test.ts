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

  it('scores at the tier 1 boundary (2 files, 50 lines)', () => {
    expect(computeEffortScore([file(25, 0), file(0, 25)])).toBe(1)
  })

  it('scores just over the tier 1 file limit as tier 2', () => {
    expect(computeEffortScore([file(1, 0), file(1, 0), file(1, 0)])).toBe(2)
  })

  it('scores just over the tier 1 line limit as tier 2', () => {
    expect(computeEffortScore([file(30, 21)])).toBe(2)
  })

  it('scores at the tier 2 boundary (5 files, 200 lines)', () => {
    expect(computeEffortScore(files(5, 40))).toBe(2)
  })

  it('scores just over the tier 2 file limit as tier 3', () => {
    expect(computeEffortScore(files(6, 1))).toBe(3)
  })

  it('scores just over the tier 2 line limit as tier 3', () => {
    expect(computeEffortScore([file(201, 0)])).toBe(3)
  })

  it('scores a single file with 300 changed lines as tier 3', () => {
    expect(computeEffortScore([file(300, 0)])).toBe(3)
  })

  it('scores six files with one line each as tier 3', () => {
    expect(computeEffortScore(files(6, 1))).toBe(3)
  })

  it('scores at the tier 3 boundary (10 files, 500 lines)', () => {
    expect(computeEffortScore(files(10, 50))).toBe(3)
  })

  it('scores just over the tier 3 file limit as tier 4', () => {
    expect(computeEffortScore(files(11, 1))).toBe(4)
  })

  it('scores just over the tier 3 line limit as tier 4', () => {
    expect(computeEffortScore([file(501, 0)])).toBe(4)
  })

  it('scores at the tier 4 boundary (20 files, 1000 lines)', () => {
    expect(computeEffortScore(files(20, 50))).toBe(4)
  })

  it('scores just over the tier 4 file limit as tier 5', () => {
    expect(computeEffortScore(files(21, 1))).toBe(5)
  })

  it('scores just over the tier 4 line limit as tier 5', () => {
    expect(computeEffortScore([file(1001, 0)])).toBe(5)
  })

  it('only counts additions plus deletions, not file count alone', () => {
    expect(computeEffortScore([file(10, 15)])).toBe(1)
  })

  it('ignores the path field when computing the score', () => {
    const a = computeEffortScore([file(10, 10, 'x/y/z.ts')])
    const b = computeEffortScore([file(10, 10, 'other.ts')])
    expect(a).toBe(b)
  })
})
