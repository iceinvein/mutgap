import { describe, expect, it } from 'vitest'
import { computeEffortScore, type PrFileEntry } from './computeEffortScore'

function file(overrides: Partial<PrFileEntry> = {}): PrFileEntry {
  return { path: 'a.ts', additions: 0, deletions: 0, ...overrides }
}

describe('computeEffortScore', () => {
  it('returns 1 for no files', () => {
    expect(computeEffortScore([])).toBe(1)
  })

  it('returns 1 for a small change (<=2 files, <50 lines)', () => {
    expect(computeEffortScore([file({ additions: 10, deletions: 5 })])).toBe(1)
    expect(
      computeEffortScore([
        file({ additions: 10 }),
        file({ additions: 10 }),
      ])
    ).toBe(1)
  })

  it('falls through to 2 when at the 2-file boundary but lines hit 50', () => {
    expect(
      computeEffortScore([file({ additions: 25 }), file({ additions: 25 })])
    ).toBe(2)
  })

  it('falls through to 2 when file count exceeds 2 even with few lines', () => {
    expect(
      computeEffortScore([file({ additions: 1 }), file({ additions: 1 }), file({ additions: 1 })])
    ).toBe(2)
  })

  it('returns 2 for <=5 files and <=200 lines', () => {
    expect(computeEffortScore([file({ additions: 100, deletions: 100 })])).toBe(2)
    expect(
      computeEffortScore([
        file({ additions: 40 }),
        file({ additions: 40 }),
        file({ additions: 40 }),
        file({ additions: 40 }),
        file({ additions: 40 }),
      ])
    ).toBe(2)
  })

  it('returns 3 for <=10 files and <=500 lines', () => {
    expect(computeEffortScore([file({ additions: 500 })])).toBe(3)
    const files = Array.from({ length: 10 }, () => file({ additions: 50 }))
    expect(computeEffortScore(files)).toBe(3)
  })

  it('returns 4 for <=20 files and <=1000 lines', () => {
    expect(computeEffortScore([file({ additions: 1000 })])).toBe(4)
    const files = Array.from({ length: 20 }, () => file({ additions: 50 }))
    expect(computeEffortScore(files)).toBe(4)
  })

  it('returns 5 when file count exceeds 20', () => {
    const files = Array.from({ length: 21 }, () => file({ additions: 1 }))
    expect(computeEffortScore(files)).toBe(5)
  })

  it('returns 5 when line count exceeds 1000', () => {
    expect(computeEffortScore([file({ additions: 1001 })])).toBe(5)
  })

  it('counts additions and deletions together', () => {
    expect(computeEffortScore([file({ additions: 30, deletions: 30 })])).toBe(2)
  })
})
