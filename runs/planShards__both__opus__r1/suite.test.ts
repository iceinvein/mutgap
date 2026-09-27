import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const chunk = (path: string, lines: number): FileChunk => ({ path, text: `// ${path}`, lines })
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  describe('basics', () => {
    it('returns [] for empty input', () => {
      expect(planShards([], 100, 10)).toEqual([])
    })

    it('puts a single small file in one shard', () => {
      const c = chunk('a.ts', 5)
      expect(planShards([c], 100, 10)).toEqual([[c]])
    })

    it('returns the original chunk objects unchanged', () => {
      const input = [chunk('a/x.ts', 3), chunk('b/y.ts', 4)]
      const shards = planShards(input, 100, 10)
      expect(shards.flat()[0]).toBe(input[0])
      expect(shards.flat()[1]).toBe(input[1])
    })

    it('packs everything into one shard when it all fits', () => {
      const input = [chunk('a/x.ts', 10), chunk('b/y.ts', 10), chunk('c.ts', 10)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'b/y.ts', 'c.ts']])
    })
  })

  describe('grouping', () => {
    it('puts root-level files in group "."', () => {
      const input = [chunk('x.ts', 1), chunk('a/y.ts', 1), chunk('z.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['x.ts', 'z.ts', 'a/y.ts']])
    })

    it('groups by directory, capped at two segments', () => {
      const input = [
        chunk('a/b/x.ts', 1),
        chunk('a/y.ts', 1),
        chunk('a/b/c/z.ts', 1),
        chunk('a/b/c/d/w.ts', 1),
        chunk('a/q.ts', 1),
      ]
      // a/b group: a/b/x.ts, a/b/c/z.ts, a/b/c/d/w.ts; a group: a/y.ts, a/q.ts
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['a/b/x.ts', 'a/b/c/z.ts', 'a/b/c/d/w.ts', 'a/y.ts', 'a/q.ts'],
      ])
    })

    it('treats a/x.ts and a/b/x.ts as different groups', () => {
      const input = [chunk('a/x.ts', 1), chunk('a/b/x.ts', 1)]
      // maxFiles 1 forces one file per shard so group order is visible
      expect(paths(planShards(input, 100, 1))).toEqual([['a/x.ts'], ['a/b/x.ts']])
    })

    it('orders groups by first appearance and keeps input order within a group', () => {
      const input = [
        chunk('b/1.ts', 1),
        chunk('a/1.ts', 1),
        chunk('b/2.ts', 1),
        chunk('root.ts', 1),
        chunk('a/2.ts', 1),
        chunk('b/3.ts', 1),
      ]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['b/1.ts', 'b/2.ts', 'b/3.ts', 'a/1.ts', 'a/2.ts', 'root.ts'],
      ])
    })
  })

  describe('line budget', () => {
    it('allows a shard totalling exactly budget lines (single group)', () => {
      const input = [chunk('a/x.ts', 5), chunk('a/y.ts', 5)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'a/y.ts']])
    })

    it('allows a shard totalling exactly budget lines (across groups)', () => {
      const input = [chunk('a/x.ts', 6), chunk('b/y.ts', 4)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'b/y.ts']])
    })

    it('closes the shard before a group that would push it over budget', () => {
      const input = [chunk('a/x.ts', 6), chunk('b/y.ts', 3), chunk('b/z.ts', 2)]
      // b totals 5; 6 + 5 = 11 > 10, so b starts a fresh shard even though b/y.ts alone would fit
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts'], ['b/y.ts', 'b/z.ts']])
    })

    it('splits a group larger than budget file by file', () => {
      const input = [chunk('a/1.ts', 4), chunk('a/2.ts', 4), chunk('a/3.ts', 4), chunk('a/4.ts', 4)]
      expect(paths(planShards(input, 8, 10))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
      ])
    })

    it('lets the next group fill the tail of a split group', () => {
      const input = [chunk('a/1.ts', 6), chunk('a/2.ts', 6), chunk('b/1.ts', 3)]
      // a (12) doesn't fit in budget 10 and is split; b fits alongside a/2.ts
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts'], ['a/2.ts', 'b/1.ts']])
    })

    it('does not close an empty shard for an oversized group', () => {
      const input = [chunk('a/1.ts', 3), chunk('a/2.ts', 3), chunk('a/3.ts', 3)]
      const shards = planShards(input, 5, 10)
      expect(paths(shards)).toEqual([['a/1.ts'], ['a/2.ts'], ['a/3.ts']])
      expect(shards.every((s) => s.length > 0)).toBe(true)
    })

    it('gives a file larger than budget a shard of its own', () => {
      const input = [chunk('a/small.ts', 2), chunk('b/huge.ts', 50), chunk('c/small.ts', 2)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/small.ts'], ['b/huge.ts'], ['c/small.ts']])
    })

    it('keeps an oversized file as the first file when it is first in input', () => {
      const input = [chunk('huge.ts', 50)]
      expect(paths(planShards(input, 10, 10))).toEqual([['huge.ts']])
    })

    it('handles zero-line files', () => {
      const input = [chunk('a/x.ts', 10), chunk('a/y.ts', 0), chunk('b/z.ts', 0)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'a/y.ts', 'b/z.ts']])
    })
  })

  describe('file limit', () => {
    it('allows a shard with exactly maxFiles files', () => {
      const input = [chunk('a/1.ts', 1), chunk('a/2.ts', 1), chunk('b/1.ts', 1)]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'a/2.ts', 'b/1.ts']])
    })

    it('closes the shard before a group that would exceed maxFiles', () => {
      const input = [chunk('a/1.ts', 1), chunk('b/1.ts', 1), chunk('b/2.ts', 1)]
      expect(paths(planShards(input, 100, 2))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('splits a group with more than maxFiles files', () => {
      const input = ['1', '2', '3', '4', '5'].map((n) => chunk(`a/${n}.ts`, 1))
      expect(paths(planShards(input, 100, 2))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
        ['a/5.ts'],
      ])
    })

    it('applies whichever of budget or maxFiles is hit first', () => {
      const input = [chunk('a/1.ts', 1), chunk('a/2.ts', 1), chunk('a/3.ts', 8), chunk('a/4.ts', 1)]
      // maxFiles 3 would allow 1,2,3 (10 lines, exactly budget); then 4 goes to a new shard
      expect(paths(planShards(input, 10, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts'], ['a/4.ts']])
    })
  })

  describe('invariants', () => {
    it('never drops files, never produces empty shards, and respects limits', () => {
      const input: FileChunk[] = []
      for (let i = 0; i < 60; i++) {
        const dir = ['', 'a/', 'a/b/', 'a/b/c/', 'd/', 'd/e/'][i % 6]
        input.push(chunk(`${dir}f${i}.ts`, (i * 37) % 23))
      }
      const budget = 30
      const maxFiles = 4
      const shards = planShards(input, budget, maxFiles)

      const out = shards.flat()
      expect(out).toHaveLength(input.length)
      expect(new Set(out)).toEqual(new Set(input))
      for (const s of shards) {
        expect(s.length).toBeGreaterThan(0)
        expect(s.length).toBeLessThanOrEqual(maxFiles)
        const total = s.reduce((n, c) => n + c.lines, 0)
        if (s.length > 1) expect(total).toBeLessThanOrEqual(budget)
      }
    })
  })
})
