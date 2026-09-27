import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

// Builds `count` files whose combined additions + deletions equal `totalLines`.
function makeFiles(count: number, totalLines: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const lines = Math.floor(totalLines / count) + (i < totalLines % count ? 1 : 0)
    return { path: `file${i}.ts`, additions: lines, deletions: 0 }
  })
}

describe('computeEffortScore', () => {
  it('returns 1 for an empty file list', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('counts both additions and deletions towards total lines', () => {
    const files: PrFileEntry[] = [{ path: 'a.ts', additions: 25, deletions: 25 }]
    // 50 lines is not < 50, so it moves up to score 2
    expect(computeEffortScore(files)).toBe(2)
    expect(computeEffortScore([{ path: 'a.ts', additions: 0, deletions: 49 }])).toBe(1)
  })

  describe('score 1', () => {
    it('applies to 1-2 files with fewer than 50 lines', () => {
      expect(computeEffortScore(makeFiles(1, 0))).toBe(1)
      expect(computeEffortScore(makeFiles(2, 49))).toBe(1)
    })

    it('does not apply at exactly 50 lines', () => {
      expect(computeEffortScore(makeFiles(2, 50))).toBe(2)
    })

    it('does not apply to 3 files even with few lines', () => {
      expect(computeEffortScore(makeFiles(3, 3))).toBe(2)
    })
  })

  describe('score 2', () => {
    it('applies up to 5 files and 200 lines inclusive', () => {
      expect(computeEffortScore(makeFiles(5, 200))).toBe(2)
    })

    it('escalates past 200 lines or 5 files', () => {
      expect(computeEffortScore(makeFiles(5, 201))).toBe(3)
      expect(computeEffortScore(makeFiles(6, 6))).toBe(3)
    })
  })

  describe('score 3', () => {
    it('applies up to 10 files and 500 lines inclusive', () => {
      expect(computeEffortScore(makeFiles(10, 500))).toBe(3)
      expect(computeEffortScore(makeFiles(1, 500))).toBe(3)
    })

    it('escalates past 500 lines or 10 files', () => {
      expect(computeEffortScore(makeFiles(10, 501))).toBe(4)
      expect(computeEffortScore(makeFiles(11, 11))).toBe(4)
    })
  })

  describe('score 4', () => {
    it('applies up to 20 files and 1000 lines inclusive', () => {
      expect(computeEffortScore(makeFiles(20, 1000))).toBe(4)
      expect(computeEffortScore(makeFiles(1, 1000))).toBe(4)
    })

    it('escalates past 1000 lines or 20 files', () => {
      expect(computeEffortScore(makeFiles(20, 1001))).toBe(5)
      expect(computeEffortScore(makeFiles(21, 21))).toBe(5)
    })
  })

  describe('score 5', () => {
    it('applies to very large changes', () => {
      expect(computeEffortScore(makeFiles(1, 10_000))).toBe(5)
      expect(computeEffortScore(makeFiles(100, 100))).toBe(5)
    })
  })

  it('treats files with zero changes as still counting towards file count', () => {
    const files: PrFileEntry[] = Array.from({ length: 21 }, (_, i) => ({
      path: `empty${i}.ts`,
      additions: 0,
      deletions: 0,
    }))
    expect(computeEffortScore(files)).toBe(5)
  })
})
