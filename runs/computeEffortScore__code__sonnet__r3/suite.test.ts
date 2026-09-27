import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  const files: PrFileEntry[] = []
  let remaining = totalLines
  for (let i = 0; i < count; i++) {
    const additions = i === count - 1 ? remaining : 0
    if (i === count - 1) remaining = 0
    files.push({ path: `file${i}.ts`, additions, deletions: 0 })
  }
  return files
}

describe('computeEffortScore', () => {
  it('returns 1 for no files', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('returns 1 for a small change (<=2 files, <50 lines)', () => {
    expect(computeEffortScore(makeFiles(2, 49))).toBe(1)
  })

  it('returns 2 when line count hits the small-change boundary (50 lines)', () => {
    expect(computeEffortScore(makeFiles(2, 50))).toBe(2)
  })

  it('returns 2 when file count exceeds the small-change boundary (3 files)', () => {
    expect(computeEffortScore(makeFiles(3, 10))).toBe(2)
  })

  it('returns 2 at the medium-change boundary (5 files, 200 lines)', () => {
    expect(computeEffortScore(makeFiles(5, 200))).toBe(2)
  })

  it('returns 3 when lines exceed the medium-change boundary (201 lines)', () => {
    expect(computeEffortScore(makeFiles(5, 201))).toBe(3)
  })

  it('returns 3 when file count exceeds the medium-change boundary (6 files)', () => {
    expect(computeEffortScore(makeFiles(6, 50))).toBe(3)
  })

  it('returns 3 at the large-change boundary (10 files, 500 lines)', () => {
    expect(computeEffortScore(makeFiles(10, 500))).toBe(3)
  })

  it('returns 4 when lines exceed the large-change boundary (501 lines)', () => {
    expect(computeEffortScore(makeFiles(10, 501))).toBe(4)
  })

  it('returns 4 when file count exceeds the large-change boundary (11 files)', () => {
    expect(computeEffortScore(makeFiles(11, 100))).toBe(4)
  })

  it('returns 4 at the very-large boundary (20 files, 1000 lines)', () => {
    expect(computeEffortScore(makeFiles(20, 1000))).toBe(4)
  })

  it('returns 5 when lines exceed the very-large boundary (1001 lines)', () => {
    expect(computeEffortScore(makeFiles(20, 1001))).toBe(5)
  })

  it('returns 5 when file count exceeds the very-large boundary (21 files)', () => {
    expect(computeEffortScore(makeFiles(21, 100))).toBe(5)
  })

  it('sums additions and deletions across files to compute total lines', () => {
    const files: PrFileEntry[] = [
      { path: 'a.ts', additions: 10, deletions: 20 },
      { path: 'b.ts', additions: 5, deletions: 15 },
    ]
    // 2 files, 50 total lines -> crosses the <50 threshold into score 2
    expect(computeEffortScore(files)).toBe(2)
  })
})
