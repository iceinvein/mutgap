import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose changed lines sum to exactly `totalLines`,
// with any remainder placed on the first file.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  const base = Math.floor(totalLines / count)
  const remainder = totalLines - base * count
  return Array.from({ length: count }, (_, i) => ({
    path: `src/file${i}.ts`,
    additions: base + (i === 0 ? remainder : 0),
    deletions: 0,
  }))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
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
    ])('%i files with %i total lines scores %i', (count, lines, expected) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(expected)
    })
  })

  describe('both limits must hold', () => {
    it('scores a single file with 300 changed lines as 3', () => {
      expect(
        computeEffortScore([{ path: 'big.ts', additions: 300, deletions: 0 }]),
      ).toBe(3)
    })

    it('scores six files with one line each as 3', () => {
      expect(computeEffortScore(makeFiles(6, 6))).toBe(3)
    })

    it('lets the file count push the score up even with few lines', () => {
      expect(computeEffortScore(makeFiles(21, 21))).toBe(5)
    })

    it('lets the line count push the score up even with one file', () => {
      expect(
        computeEffortScore([{ path: 'huge.ts', additions: 1001, deletions: 0 }]),
      ).toBe(5)
    })
  })

  describe('total lines', () => {
    it('counts deletions as well as additions', () => {
      expect(
        computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 51 }]),
      ).toBe(2)
    })

    it('sums additions and deletions within a file', () => {
      expect(
        computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 25 }]),
      ).toBe(1)
      expect(
        computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 26 }]),
      ).toBe(2)
    })

    it('sums changed lines across all files', () => {
      const files: PrFileEntry[] = [
        { path: 'a.ts', additions: 20, deletions: 5 },
        { path: 'b.ts', additions: 10, deletions: 16 },
      ]
      // 51 total lines across 2 files
      expect(computeEffortScore(files)).toBe(2)
    })

    it('counts files with zero changed lines towards the file count', () => {
      const files: PrFileEntry[] = [
        { path: 'a.ts', additions: 0, deletions: 0 },
        { path: 'b.ts', additions: 0, deletions: 0 },
        { path: 'c.ts', additions: 0, deletions: 0 },
      ]
      expect(computeEffortScore(files)).toBe(2)
    })
  })

  it('ignores file paths', () => {
    const a: PrFileEntry[] = [{ path: 'README.md', additions: 100, deletions: 0 }]
    const b: PrFileEntry[] = [
      { path: 'src/core/engine.ts', additions: 100, deletions: 0 },
    ]
    expect(computeEffortScore(a)).toBe(computeEffortScore(b))
  })
})
