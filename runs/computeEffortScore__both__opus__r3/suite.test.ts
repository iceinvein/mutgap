import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Build `count` files whose additions sum to `totalLines`.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const base = Math.floor(totalLines / count)
    const extra = i < totalLines % count ? 1 : 0
    return { path: `file${i}.ts`, additions: base + extra, deletions: 0 }
  })
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions toward total lines', () => {
    expect(computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 25 }])).toBe(1)
    expect(computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 26 }])).toBe(2)
    expect(computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 51 }])).toBe(2)
  })

  it('sums lines across all files', () => {
    const files = [
      { path: 'a.ts', additions: 20, deletions: 10 },
      { path: 'b.ts', additions: 15, deletions: 6 },
    ]
    expect(computeEffortScore(files)).toBe(2) // 51 lines
  })

  it('ignores file paths', () => {
    const a = [{ path: 'README.md', additions: 100, deletions: 0 }]
    const b = [{ path: 'src/core/engine.ts', additions: 100, deletions: 0 }]
    expect(computeEffortScore(a)).toBe(computeEffortScore(b))
  })

  describe.each([
    { score: 1, maxFiles: 2, maxLines: 50 },
    { score: 2, maxFiles: 5, maxLines: 200 },
    { score: 3, maxFiles: 10, maxLines: 500 },
    { score: 4, maxFiles: 20, maxLines: 1000 },
  ])('tier $score (≤ $maxFiles files, ≤ $maxLines lines)', ({ score, maxFiles, maxLines }) => {
    it('includes both limits exactly', () => {
      expect(computeEffortScore(makeFiles(maxFiles, maxLines))).toBe(score)
    })

    it('includes the line limit with a single file', () => {
      expect(computeEffortScore(makeFiles(1, maxLines))).toBe(score)
    })

    it('moves up a tier when lines exceed the limit by one', () => {
      expect(computeEffortScore(makeFiles(1, maxLines + 1))).toBe(score + 1)
    })

    it('moves up a tier when files exceed the limit by one', () => {
      expect(computeEffortScore(makeFiles(maxFiles + 1, maxFiles + 1))).toBe(score + 1)
    })
  })

  it('scores 5 for anything beyond tier 4', () => {
    expect(computeEffortScore(makeFiles(21, 21))).toBe(5)
    expect(computeEffortScore(makeFiles(1, 1001))).toBe(5)
    expect(computeEffortScore(makeFiles(100, 100_000))).toBe(5)
  })

  it('requires both limits: examples from the spec', () => {
    expect(computeEffortScore(makeFiles(1, 300))).toBe(3)
    expect(computeEffortScore(makeFiles(6, 6))).toBe(3)
  })

  it('treats files with zero changes as still counting toward file count', () => {
    expect(computeEffortScore(makeFiles(3, 0))).toBe(2)
  })
})
