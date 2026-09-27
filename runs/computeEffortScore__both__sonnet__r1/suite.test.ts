import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(additions: number, deletions: number, path = 'f'): PrFileEntry {
  return { path, additions, deletions }
}

function files(count: number, linesEach: number): PrFileEntry[] {
  return Array.from({ length: count }, (_, i) => file(linesEach, 0, `f${i}`))
}

describe('computeEffortScore', () => {
  it('scores an empty list as 1', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('sums additions and deletions across all files as the line count', () => {
    const entries = [file(10, 5, 'a'), file(3, 2, 'b')]
    // 20 total lines, 2 files -> tier 1
    expect(computeEffortScore(entries)).toBe(1)
  })

  describe('tier 1: at most 2 files and at most 50 lines', () => {
    it('scores 1 at the exact limits (2 files, 50 lines)', () => {
      expect(computeEffortScore(files(2, 25))).toBe(1)
    })

    it('scores 1 for a single small file', () => {
      expect(computeEffortScore([file(5, 3)])).toBe(1)
    })

    it('bumps to tier 2 when lines exceed 50, even with few files', () => {
      expect(computeEffortScore(files(2, 26))).toBe(2)
    })

    it('bumps to tier 2 when files exceed 2, even with few lines', () => {
      expect(computeEffortScore(files(3, 1))).toBe(2)
    })
  })

  describe('tier 2: at most 5 files and at most 200 lines', () => {
    it('scores 2 at the exact limits (5 files, 200 lines)', () => {
      expect(computeEffortScore(files(5, 40))).toBe(2)
    })

    it('bumps to tier 3 when lines exceed 200', () => {
      expect(computeEffortScore(files(5, 41))).toBe(3)
    })

    it('bumps to tier 3 when files exceed 5', () => {
      expect(computeEffortScore(files(6, 1))).toBe(3)
    })
  })

  describe('tier 3: at most 10 files and at most 500 lines', () => {
    it('scores 3 at the exact limits (10 files, 500 lines)', () => {
      expect(computeEffortScore(files(10, 50))).toBe(3)
    })

    it('scores 3 for a single file with 300 changed lines (spec example)', () => {
      expect(computeEffortScore([file(300, 0)])).toBe(3)
    })

    it('scores 3 for six files with one line each (spec example)', () => {
      expect(computeEffortScore(files(6, 1))).toBe(3)
    })

    it('bumps to tier 4 when lines exceed 500', () => {
      expect(computeEffortScore(files(10, 51))).toBe(4)
    })

    it('bumps to tier 4 when files exceed 10', () => {
      expect(computeEffortScore(files(11, 1))).toBe(4)
    })
  })

  describe('tier 4: at most 20 files and at most 1000 lines', () => {
    it('scores 4 at the exact limits (20 files, 1000 lines)', () => {
      expect(computeEffortScore(files(20, 50))).toBe(4)
    })

    it('bumps to tier 5 when lines exceed 1000', () => {
      expect(computeEffortScore(files(20, 51))).toBe(5)
    })

    it('bumps to tier 5 when files exceed 20', () => {
      expect(computeEffortScore(files(21, 1))).toBe(5)
    })
  })

  describe('tier 5: anything larger', () => {
    it('scores 5 for large changes', () => {
      expect(computeEffortScore(files(50, 100))).toBe(5)
    })
  })
})
