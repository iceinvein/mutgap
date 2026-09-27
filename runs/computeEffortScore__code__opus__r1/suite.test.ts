import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose additions + deletions sum to `lines`.
function makeFiles(count: number, lines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `file${i}.ts`,
    additions: i === 0 ? lines : 0,
    deletions: 0,
  }))
}

describe('computeEffortScore', () => {
  it('returns 1 for an empty file list', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions toward the line total', () => {
    const files: PrFileEntry[] = [
      { path: 'a.ts', additions: 25, deletions: 24 },
    ]
    expect(computeEffortScore(files)).toBe(1)
    files[0].deletions = 25
    expect(computeEffortScore(files)).toBe(2)
  })

  it('sums lines across multiple files', () => {
    const files: PrFileEntry[] = [
      { path: 'a.ts', additions: 10, deletions: 15 },
      { path: 'b.ts', additions: 20, deletions: 5 },
    ]
    // 50 lines total, which is not < 50
    expect(computeEffortScore(files)).toBe(2)
  })

  describe('score 1: <= 2 files and < 50 lines', () => {
    it.each([
      [1, 0],
      [1, 49],
      [2, 49],
    ])('%i files, %i lines -> 1', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(1)
    })

    it('treats 50 lines as exclusive upper bound', () => {
      expect(computeEffortScore(makeFiles(2, 50))).toBe(2)
    })

    it('bumps to 2 with a third file', () => {
      expect(computeEffortScore(makeFiles(3, 0))).toBe(2)
    })
  })

  describe('score 2: <= 5 files and <= 200 lines', () => {
    it.each([
      [1, 50],
      [5, 200],
      [3, 10],
    ])('%i files, %i lines -> 2', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(2)
    })

    it('bumps to 3 past 200 lines', () => {
      expect(computeEffortScore(makeFiles(5, 201))).toBe(3)
    })

    it('bumps to 3 with a sixth file', () => {
      expect(computeEffortScore(makeFiles(6, 0))).toBe(3)
    })
  })

  describe('score 3: <= 10 files and <= 500 lines', () => {
    it.each([
      [1, 201],
      [10, 500],
      [6, 0],
    ])('%i files, %i lines -> 3', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(3)
    })

    it('bumps to 4 past 500 lines', () => {
      expect(computeEffortScore(makeFiles(10, 501))).toBe(4)
    })

    it('bumps to 4 with an eleventh file', () => {
      expect(computeEffortScore(makeFiles(11, 0))).toBe(4)
    })
  })

  describe('score 4: <= 20 files and <= 1000 lines', () => {
    it.each([
      [1, 501],
      [20, 1000],
      [11, 0],
    ])('%i files, %i lines -> 4', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(4)
    })

    it('bumps to 5 past 1000 lines', () => {
      expect(computeEffortScore(makeFiles(20, 1001))).toBe(5)
    })

    it('bumps to 5 with a twenty-first file', () => {
      expect(computeEffortScore(makeFiles(21, 0))).toBe(5)
    })
  })

  describe('score 5', () => {
    it('applies to a single huge file', () => {
      expect(computeEffortScore(makeFiles(1, 10_000))).toBe(5)
    })

    it('applies to many tiny files', () => {
      expect(computeEffortScore(makeFiles(100, 1))).toBe(5)
    })
  })

  it('lets the larger dimension determine the score', () => {
    // few files but many lines
    expect(computeEffortScore(makeFiles(1, 600))).toBe(4)
    // many files but few lines
    expect(computeEffortScore(makeFiles(15, 5))).toBe(4)
  })
})
