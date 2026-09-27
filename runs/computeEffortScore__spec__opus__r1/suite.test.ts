import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose changed lines sum to `totalLines`, spread as evenly as possible.
function files(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const lines = Math.floor(totalLines / count) + (i < totalLines % count ? 1 : 0)
    const additions = Math.ceil(lines / 2)
    return { path: `src/file${i}.ts`, additions, deletions: lines - additions }
  })
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  describe('spec examples', () => {
    it('scores a single file with 300 changed lines as 3', () => {
      expect(computeEffortScore([{ path: 'a.ts', additions: 300, deletions: 0 }])).toBe(3)
    })

    it('scores six files with one line each as 3', () => {
      expect(computeEffortScore(files(6, 6))).toBe(3)
    })
  })

  describe('tier boundaries (limits are inclusive)', () => {
    it.each([
      // [files, lines, expected]
      [1, 1, 1],
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
      expect(computeEffortScore(files(count, lines))).toBe(expected)
    })
  })

  describe('both limits must hold', () => {
    it('uses the line count when files are few but lines are many', () => {
      expect(computeEffortScore(files(1, 1001))).toBe(5)
    })

    it('uses the file count when files are many but lines are few', () => {
      expect(computeEffortScore(files(21, 21))).toBe(5)
    })

    it('scores files with zero changed lines by file count alone', () => {
      expect(computeEffortScore(files(11, 0))).toBe(4)
    })
  })

  describe('total lines', () => {
    it('counts deletions as well as additions', () => {
      expect(computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 51 }])).toBe(2)
      expect(computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 26 }])).toBe(2)
      expect(computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 25 }])).toBe(1)
    })

    it('sums changed lines across all files', () => {
      const entries: PrFileEntry[] = [
        { path: 'a.ts', additions: 20, deletions: 5 },
        { path: 'b.ts', additions: 10, deletions: 16 },
      ]
      // 51 lines across 2 files: over the tier-1 line limit
      expect(computeEffortScore(entries)).toBe(2)
    })

    it('ignores file paths', () => {
      const a = [{ path: 'README.md', additions: 100, deletions: 0 }]
      const b = [{ path: 'src/core/engine.ts', additions: 100, deletions: 0 }]
      expect(computeEffortScore(a)).toBe(computeEffortScore(b))
    })
  })
})
