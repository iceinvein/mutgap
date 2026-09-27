import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose changed lines sum to `totalLines`, split across
// additions and deletions so both fields are exercised.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const base = Math.floor(totalLines / count)
    const lines = i === 0 ? base + (totalLines % count) : base
    const additions = Math.ceil(lines / 2)
    return { path: `src/file${i}.ts`, additions, deletions: lines - additions }
  })
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions toward total lines', () => {
    // 30 + 30 = 60 lines exceeds tier 1's 50-line limit
    expect(computeEffortScore([{ path: 'a.ts', additions: 30, deletions: 30 }])).toBe(2)
    expect(computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 51 }])).toBe(2)
    expect(computeEffortScore([{ path: 'a.ts', additions: 51, deletions: 0 }])).toBe(2)
  })

  it('ignores file paths', () => {
    const a = [{ path: 'README.md', additions: 10, deletions: 0 }]
    const b = [{ path: 'src/core/engine.ts', additions: 10, deletions: 0 }]
    expect(computeEffortScore(a)).toBe(computeEffortScore(b))
  })

  describe('tier boundaries are inclusive on both limits', () => {
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
      [100, 10000, 5],
    ])('%i files with %i lines scores %i', (count, lines, expected) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(expected)
    })
  })

  it('requires both limits to hold (spec examples)', () => {
    expect(computeEffortScore(makeFiles(1, 300))).toBe(3)
    expect(computeEffortScore(makeFiles(6, 6))).toBe(3)
  })

  it('lets a small line count with many files push the score up', () => {
    expect(computeEffortScore(makeFiles(21, 21))).toBe(5)
  })
})
