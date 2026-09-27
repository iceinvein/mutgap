import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const chunk = (path: string, lines: number): FileChunk => ({ path, text: '', lines })
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  it('returns no shards for no chunks', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts everything in one shard when it fits', () => {
    const chunks = [chunk('a.ts', 10), chunk('src/b.ts', 10), chunk('src/c/d.ts', 10)]
    expect(paths(planShards(chunks, 100, 10))).toEqual([['a.ts', 'src/b.ts', 'src/c/d.ts']])
  })

  it('preserves every chunk exactly once', () => {
    const chunks = Array.from({ length: 25 }, (_, i) => chunk(`d${i % 4}/f${i}.ts`, (i % 7) + 1))
    const shards = planShards(chunks, 12, 3)
    expect(shards.flat()).toHaveLength(chunks.length)
    expect(new Set(shards.flat())).toEqual(new Set(chunks))
  })

  describe('grouping', () => {
    it('groups by up to two leading directories', () => {
      // groups: '.', 'src', 'src/a' (src/a/x and src/a/b/y share 'src/a')
      const chunks = [
        chunk('root.ts', 5),
        chunk('src/top.ts', 5),
        chunk('src/a/x.ts', 5),
        chunk('src/a/b/y.ts', 5),
      ]
      // maxFiles=2 splits at the first group boundary that would overflow, revealing the groups
      expect(paths(planShards(chunks, 100, 2))).toEqual([
        ['root.ts', 'src/top.ts'],
        ['src/a/x.ts', 'src/a/b/y.ts'],
      ])
    })

    it('pulls non-contiguous files of the same group together, ordered by first appearance', () => {
      const chunks = [chunk('a/1.ts', 1), chunk('b/1.ts', 1), chunk('a/2.ts', 1)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a/1.ts', 'a/2.ts', 'b/1.ts']])
    })

    it('starts a new shard rather than splitting a group that would overflow the budget', () => {
      const chunks = [chunk('a/1.ts', 6), chunk('b/1.ts', 3), chunk('b/2.ts', 3)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('starts a new shard rather than splitting a group that would overflow maxFiles', () => {
      const chunks = [chunk('a/1.ts', 1), chunk('b/1.ts', 1), chunk('b/2.ts', 1)]
      expect(paths(planShards(chunks, 100, 2))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('combines multiple small groups into one shard', () => {
      const chunks = [chunk('a/1.ts', 2), chunk('b/1.ts', 2), chunk('c/1.ts', 2)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'b/1.ts', 'c/1.ts']])
    })
  })

  describe('limits', () => {
    it('splits a group larger than maxFiles', () => {
      const chunks = [1, 2, 3, 4, 5].map((i) => chunk(`a/${i}.ts`, 1))
      expect(paths(planShards(chunks, 100, 2))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
        ['a/5.ts'],
      ])
    })

    it('splits a group larger than the budget', () => {
      const chunks = [1, 2, 3].map((i) => chunk(`a/${i}.ts`, 6))
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts'], ['a/2.ts'], ['a/3.ts']])
    })

    it('gives an oversized file its own shard instead of dropping it', () => {
      const chunks = [chunk('a/small.ts', 2), chunk('a/huge.ts', 500), chunk('a/tail.ts', 2)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/small.ts'], ['a/huge.ts'], ['a/tail.ts']])
    })

    it('never exceeds maxFiles per shard', () => {
      const chunks = Array.from({ length: 30 }, (_, i) => chunk(`d${i % 3}/f${i}.ts`, 1))
      for (const shard of planShards(chunks, 1000, 4)) expect(shard.length).toBeLessThanOrEqual(4)
    })

    it('never exceeds the budget unless a single file is larger than it', () => {
      const chunks = Array.from({ length: 30 }, (_, i) => chunk(`d${i % 3}/f${i}.ts`, (i % 5) + 1))
      for (const shard of planShards(chunks, 8, 100)) {
        const total = shard.reduce((n, c) => n + c.lines, 0)
        expect(total).toBeLessThanOrEqual(8)
      }
    })

    it('allows a shard of exactly the budget across groups', () => {
      const chunks = [chunk('a/1.ts', 5), chunk('b/1.ts', 5)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'b/1.ts']])
    })

    it('allows a shard of exactly the budget within a single group', () => {
      const chunks = [chunk('a/1.ts', 5), chunk('a/2.ts', 5)]
      expect(paths(planShards(chunks, 10, 10))).toEqual([['a/1.ts', 'a/2.ts']])
    })
  })
})
