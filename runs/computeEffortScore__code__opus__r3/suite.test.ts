import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose additions sum to `totalLines`.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `file${i}.ts`,
    additions: i === 0 ? totalLines : 0,
    deletions: 0,
  }))
}

describe('computeEffortScore', () => {
  it('returns 1 for an empty file list', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions toward the line total', () => {
    // 25 + 25 = 50 lines, which is not < 50, so it falls through to 2
    const files = [{ path: 'a.ts', additions: 25, deletions: 25 }]
    expect(computeEffortScore(files)).toBe(2)

    const smaller = [{ path: 'a.ts', additions: 25, deletions: 24 }]
    expect(computeEffortScore(smaller)).toBe(1)
  })

  it('sums lines across all files', () => {
    const files = [
      { path: 'a.ts', additions: 20, deletions: 0 },
      { path: 'b.ts', additions: 0, deletions: 30 },
    ]
    expect(computeEffortScore(files)).toBe(2)
  })

  describe('score 1', () => {
    it.each([
      [1, 0],
      [1, 49],
      [2, 49],
    ])('%i files, %i lines -> 1', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(1)
    })

    it('requires strictly fewer than 50 lines', () => {
      expect(computeEffortScore(makeFiles(2, 50))).toBe(2)
    })

    it('requires at most 2 files', () => {
      expect(computeEffortScore(makeFiles(3, 0))).toBe(2)
    })
  })

  describe('score 2', () => {
    it.each([
      [1, 50],
      [3, 0],
      [5, 200],
    ])('%i files, %i lines -> 2', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(2)
    })

    it('boundaries: 201 lines or 6 files bump to 3', () => {
      expect(computeEffortScore(makeFiles(5, 201))).toBe(3)
      expect(computeEffortScore(makeFiles(6, 0))).toBe(3)
    })
  })

  describe('score 3', () => {
    it.each([
      [1, 201],
      [6, 0],
      [10, 500],
    ])('%i files, %i lines -> 3', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(3)
    })

    it('boundaries: 501 lines or 11 files bump to 4', () => {
      expect(computeEffortScore(makeFiles(10, 501))).toBe(4)
      expect(computeEffortScore(makeFiles(11, 0))).toBe(4)
    })
  })

  describe('score 4', () => {
    it.each([
      [1, 501],
      [11, 0],
      [20, 1000],
    ])('%i files, %i lines -> 4', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(4)
    })

    it('boundaries: 1001 lines or 21 files bump to 5', () => {
      expect(computeEffortScore(makeFiles(20, 1001))).toBe(5)
      expect(computeEffortScore(makeFiles(21, 0))).toBe(5)
    })
  })

  describe('score 5', () => {
    it.each([
      [1, 1001],
      [21, 0],
      [100, 100_000],
    ])('%i files, %i lines -> 5', (count, lines) => {
      expect(computeEffortScore(makeFiles(count, lines))).toBe(5)
    })
  })
})
