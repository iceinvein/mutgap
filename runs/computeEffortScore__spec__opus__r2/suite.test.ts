import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose total changed lines equal `lines`, split as
// evenly as possible and across both additions and deletions.
function files(count: number, lines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const perFile = Math.floor(lines / count) + (i < lines % count ? 1 : 0)
    const additions = Math.ceil(perFile / 2)
    return { path: `src/file${i}.ts`, additions, deletions: perFile - additions }
  })
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
      [2, 51, 2],
      [3, 50, 2],
      [5, 200, 2],
      [5, 201, 3],
      [6, 200, 3],
      [10, 500, 3],
      [10, 501, 4],
      [11, 500, 4],
      [20, 1000, 4],
      [20, 1001, 5],
      [21, 1000, 5],
      [50, 10000, 5],
    ])('%i files with %i total lines scores %i', (count, lines, expected) => {
      expect(computeEffortScore(files(count, lines))).toBe(expected)
    })
  })

  it('requires both limits: a single file with 300 lines scores 3', () => {
    expect(
      computeEffortScore([{ path: 'big.ts', additions: 300, deletions: 0 }]),
    ).toBe(3)
  })

  it('requires both limits: six files with one line each score 3', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      path: `f${i}.ts`,
      additions: 1,
      deletions: 0,
    }))
    expect(computeEffortScore(six)).toBe(3)
  })

  it('counts deletions as well as additions toward total lines', () => {
    // 25 + 26 = 51 lines: over the tier-1 line limit only because of deletions
    expect(
      computeEffortScore([{ path: 'a.ts', additions: 25, deletions: 26 }]),
    ).toBe(2)
    // deletions alone count too
    expect(
      computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 1001 }]),
    ).toBe(5)
  })

  it('sums lines across all files', () => {
    expect(
      computeEffortScore([
        { path: 'a.ts', additions: 20, deletions: 5 },
        { path: 'b.ts', additions: 10, deletions: 16 },
      ]),
    ).toBe(2) // 51 lines, 2 files
  })

  it('ignores file paths', () => {
    const a = [
      { path: 'README.md', additions: 30, deletions: 20 },
      { path: 'src/core/engine.ts', additions: 0, deletions: 0 },
    ]
    const b = a.map((f, i) => ({ ...f, path: `other/${i}` }))
    expect(computeEffortScore(a)).toBe(1)
    expect(computeEffortScore(b)).toBe(1)
  })

  it('counts files with zero changed lines toward the file count', () => {
    const empties = Array.from({ length: 3 }, (_, i) => ({
      path: `e${i}.ts`,
      additions: 0,
      deletions: 0,
    }))
    expect(computeEffortScore(empties)).toBe(2)
  })

  it('does not depend on file order', () => {
    const list = [
      { path: 'a.ts', additions: 400, deletions: 0 },
      { path: 'b.ts', additions: 1, deletions: 0 },
    ]
    expect(computeEffortScore(list)).toBe(computeEffortScore([...list].reverse()))
    expect(computeEffortScore(list)).toBe(3)
  })
})
