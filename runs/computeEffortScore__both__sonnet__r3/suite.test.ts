import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function filesWithLines(fileCount: number, totalLines: number): PrFileEntry[] {
  if (fileCount === 0) return []
  const base = Math.floor(totalLines / fileCount)
  const remainder = totalLines % fileCount
  return Array.from({ length: fileCount }, (_, i) => ({
    path: `file${i}.ts`,
    additions: base + (i === 0 ? remainder : 0),
    deletions: 0,
  }))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  describe('tier 1: at most 2 files and at most 50 lines', () => {
    it('scores 1 for 0 lines and 1 file', () => {
      expect(computeEffortScore(filesWithLines(1, 0))).toBe(1)
    })

    it('scores 1 at the file and line limits (2 files, 50 lines)', () => {
      expect(computeEffortScore(filesWithLines(2, 50))).toBe(1)
    })

    it('scores 2 when lines exceed the tier 1 limit by one', () => {
      expect(computeEffortScore(filesWithLines(2, 51))).toBe(2)
    })

    it('scores 2 when files exceed the tier 1 limit by one', () => {
      expect(computeEffortScore(filesWithLines(3, 10))).toBe(2)
    })
  })

  describe('tier 2: at most 5 files and at most 200 lines', () => {
    it('scores 2 at the file and line limits (5 files, 200 lines)', () => {
      expect(computeEffortScore(filesWithLines(5, 200))).toBe(2)
    })

    it('scores 3 when lines exceed the tier 2 limit by one', () => {
      expect(computeEffortScore(filesWithLines(5, 201))).toBe(3)
    })

    it('scores 3 when files exceed the tier 2 limit by one', () => {
      expect(computeEffortScore(filesWithLines(6, 100))).toBe(3)
    })
  })

  describe('tier 3: at most 10 files and at most 500 lines', () => {
    it('scores 3 at the file and line limits (10 files, 500 lines)', () => {
      expect(computeEffortScore(filesWithLines(10, 500))).toBe(3)
    })

    it('scores 3 for a single file with 300 changed lines', () => {
      expect(computeEffortScore(filesWithLines(1, 300))).toBe(3)
    })

    it('scores 3 for six files with one line each', () => {
      expect(computeEffortScore(filesWithLines(6, 6))).toBe(3)
    })

    it('scores 4 when lines exceed the tier 3 limit by one', () => {
      expect(computeEffortScore(filesWithLines(10, 501))).toBe(4)
    })

    it('scores 4 when files exceed the tier 3 limit by one', () => {
      expect(computeEffortScore(filesWithLines(11, 100))).toBe(4)
    })
  })

  describe('tier 4: at most 20 files and at most 1000 lines', () => {
    it('scores 4 at the file and line limits (20 files, 1000 lines)', () => {
      expect(computeEffortScore(filesWithLines(20, 1000))).toBe(4)
    })

    it('scores 5 when lines exceed the tier 4 limit by one', () => {
      expect(computeEffortScore(filesWithLines(20, 1001))).toBe(5)
    })

    it('scores 5 when files exceed the tier 4 limit by one', () => {
      expect(computeEffortScore(filesWithLines(21, 100))).toBe(5)
    })
  })

  describe('tier 5: anything larger', () => {
    it('scores 5 for large file counts and line counts', () => {
      expect(computeEffortScore(filesWithLines(50, 5000))).toBe(5)
    })
  })

  it('counts additions plus deletions across all files as total lines', () => {
    const files: PrFileEntry[] = [
      { path: 'a.ts', additions: 10, deletions: 5 },
      { path: 'b.ts', additions: 20, deletions: 15 },
    ]
    // total lines = 10 + 5 + 20 + 15 = 50, 2 files -> tier 1
    expect(computeEffortScore(files)).toBe(1)
  })
})
