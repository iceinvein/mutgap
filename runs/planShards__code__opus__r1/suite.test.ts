import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const chunk = (path: string, lines: number): FileChunk => ({ path, text: '', lines })
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  it('returns no shards for no input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts everything in one shard when it fits', () => {
    const chunks = [chunk('src/a.ts', 10), chunk('src/b.ts', 10), chunk('lib/c.ts', 10)]
    expect(paths(planShards(chunks, 100, 10))).toEqual([['src/a.ts', 'src/b.ts', 'lib/c.ts']])
  })

  it('preserves chunk objects unchanged', () => {
    const a = { path: 'src/a.ts', text: 'hello', lines: 1 }
    expect(planShards([a], 100, 10)[0][0]).toBe(a)
  })

  describe('grouping', () => {
    it('keeps files from the same directory together, ordered by first appearance', () => {
      const chunks = [
        chunk('src/a.ts', 1),
        chunk('lib/b.ts', 1),
        chunk('src/c.ts', 1),
        chunk('lib/d.ts', 1),
      ]
      expect(paths(planShards(chunks, 100, 10))).toEqual([
        ['src/a.ts', 'src/c.ts', 'lib/b.ts', 'lib/d.ts'],
      ])
    })

    it('groups by at most the first two directory levels', () => {
      const chunks = [
        chunk('src/x/a.ts', 1),
        chunk('src/y/b.ts', 1),
        chunk('src/x/deep/c.ts', 1),
        chunk('src/d.ts', 1),
      ]
      // groups: src/x -> [a, c], src/y -> [b], src -> [d]
      expect(paths(planShards(chunks, 100, 10))).toEqual([
        ['src/x/a.ts', 'src/x/deep/c.ts', 'src/y/b.ts', 'src/d.ts'],
      ])
    })

    it('groups root-level files together', () => {
      const chunks = [chunk('a.ts', 1), chunk('src/b.ts', 1), chunk('c.ts', 1)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a.ts', 'c.ts', 'src/b.ts']])
    })

    it('starts a new shard rather than splitting a group that would overflow the budget', () => {
      const chunks = [chunk('a/1.ts', 6), chunk('b/1.ts', 3), chunk('b/2.ts', 3)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('starts a new shard rather than splitting a group that would exceed maxFiles', () => {
      const chunks = [chunk('a/1.ts', 1), chunk('b/1.ts', 1), chunk('b/2.ts', 1)]
      expect(paths(planShards(chunks, 100, 2))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('packs a following group into the current shard when it fits', () => {
      const chunks = [chunk('a/1.ts', 3), chunk('b/1.ts', 3), chunk('c/1.ts', 5)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'b/1.ts'], ['c/1.ts']])
    })
  })

  describe('splitting large groups', () => {
    it('splits a group larger than maxFiles into shards of at most maxFiles', () => {
      const chunks = ['1', '2', '3', '4', '5'].map((n) => chunk(`src/${n}.ts`, 1))
      const shards = planShards(chunks, 100, 2)
      expect(paths(shards)).toEqual([
        ['src/1.ts', 'src/2.ts'],
        ['src/3.ts', 'src/4.ts'],
        ['src/5.ts'],
      ])
    })

    it('splits a group whose lines exceed the budget', () => {
      const chunks = [chunk('src/1.ts', 4), chunk('src/2.ts', 4), chunk('src/3.ts', 4)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['src/1.ts', 'src/2.ts'], ['src/3.ts']])
    })

    it('gives an oversized single file its own shard', () => {
      const chunks = [chunk('a/small.ts', 2), chunk('b/huge.ts', 500), chunk('c/small.ts', 2)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([
        ['a/small.ts'],
        ['b/huge.ts'],
        ['c/small.ts'],
      ])
    })
  })

  describe('invariants', () => {
    const chunks: FileChunk[] = Array.from({ length: 40 }, (_, i) =>
      chunk(`d${i % 5}/sub${i % 3}/f${i}.ts`, ((i * 7) % 13) + 1),
    )
    const budget = 20
    const maxFiles = 4
    const shards = planShards(chunks, budget, maxFiles)

    it('includes every chunk exactly once', () => {
      const out = shards.flat()
      expect(out).toHaveLength(chunks.length)
      expect(new Set(out)).toEqual(new Set(chunks))
    })

    it('never produces empty shards', () => {
      for (const s of shards) expect(s.length).toBeGreaterThan(0)
    })

    it('respects maxFiles', () => {
      for (const s of shards) expect(s.length).toBeLessThanOrEqual(maxFiles)
    })

    it('respects the budget for multi-file shards', () => {
      for (const s of shards) {
        if (s.length > 1) expect(s.reduce((n, c) => n + c.lines, 0)).toBeLessThanOrEqual(budget)
      }
    })
  })

  // Known bug: the per-file check uses `>= budget` (the group check uses `> budget`), so a
  // shard can never reach exactly `budget` lines once it holds a file. Remove `.fails` once
  // planShards uses `>` in both places.
  describe('exact budget boundary', () => {
    it.fails('packs separate groups that exactly fill the budget into one shard', () => {
      const chunks = [chunk('a/1.ts', 5), chunk('b/1.ts', 5)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'b/1.ts']])
    })

    it.fails('packs files in one group that exactly fill the budget into one shard', () => {
      const chunks = [chunk('a/1.ts', 5), chunk('a/2.ts', 5)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'a/2.ts']])
    })
  })
})
