import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose changed lines sum to `totalLines`.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const base = Math.floor(totalLines / count)
    const lines = i === 0 ? base + (totalLines % count) : base
    return { path: `file${i}.ts`, additions: lines, deletions: 0 }
  })
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions toward total lines', () => {
    const files = [{ path: 'a.ts', additions: 30, deletions: 30 }]
    expect(computeEffortScore(files)).toBe(2)
  })

  it('sums lines across all files', () => {
    const files = [
      { path: 'a.ts', additions: 20, deletions: 10 },
      { path: 'b.ts', additions: 15, deletions: 6 },
    ]
    expect(computeEffortScore(files)).toBe(2)
  })

  it('ignores file paths', () => {
    const a = [{ path: 'src/x.ts', additions: 10, deletions: 0 }]
    const b = [{ path: 'docs/README.md', additions: 10, deletions: 0 }]
    expect(computeEffortScore(a)).toBe(computeEffortScore(b))
  })

  describe('tier boundaries (both limits inclusive)', () => {
    it.each([
      // [files, lines, expected]
      [1, 0, 1],
      [2, 50, 1],
      [3, 50, 2],
      [2, 51, 2],
      [5, 200, 2],
      [6, 200, 3],
      [5, 201, 3],
      [10, 500, 3],
      [11, 500, 4],
      [10, 501, 4],
      [20, 1000, 4],
      [21, 1000, 5],
      [20, 1001, 5],
      [50, 10000, 5],
    ])('%i files with %i lines scores %i', (count, lines, expected) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(expected)
    })
  })

  describe('both limits must hold', () => {
    it('scores a single file with 300 changed lines as 3', () => {
      expect(computeEffortScore([{ path: 'big.ts', additions: 300, deletions: 0 }])).toBe(3)
    })

    it('scores six files with one line each as 3', () => {
      expect(computeEffortScore(makeFiles(6, 6))).toBe(3)
    })

    it('scores many files with few lines by file count', () => {
      expect(computeEffortScore(makeFiles(21, 21))).toBe(5)
    })

    it('scores one file with many lines by line count', () => {
      expect(computeEffortScore([{ path: 'huge.ts', additions: 600, deletions: 500 }])).toBe(5)
    })
  })
})
