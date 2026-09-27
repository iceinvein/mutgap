import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const chunk = (path: string, lines: number): FileChunk => ({ path, text: '', lines })
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  it('returns no shards for no chunks', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts everything in one shard when it fits', () => {
    const chunks = [chunk('src/a.ts', 10), chunk('lib/b.ts', 20), chunk('c.ts', 5)]
    expect(paths(planShards(chunks, 100, 10))).toEqual([['src/a.ts', 'lib/b.ts', 'c.ts']])
  })

  it('preserves every chunk exactly once', () => {
    const chunks = Array.from({ length: 25 }, (_, i) => chunk(`d${i % 4}/sub${i % 3}/f${i}.ts`, (i * 7) % 30 + 1))
    const out = planShards(chunks, 40, 3).flat()
    expect(out).toHaveLength(chunks.length)
    expect(new Set(out)).toEqual(new Set(chunks))
  })

  it('never produces empty shards', () => {
    const chunks = [chunk('a/x.ts', 500), chunk('b/y.ts', 500)]
    const shards = planShards(chunks, 100, 10)
    expect(shards.every((s) => s.length > 0)).toBe(true)
  })

  describe('grouping', () => {
    it('groups files by up to two leading directories', () => {
      // a/b/c/d.ts and a/b/e.ts share key "a/b"; a/f.ts has key "a"; root files have key "."
      const chunks = [
        chunk('a/b/c/d.ts', 1),
        chunk('a/f.ts', 1),
        chunk('root.ts', 1),
        chunk('a/b/e.ts', 1),
        chunk('other.ts', 1),
      ]
      expect(paths(planShards(chunks, 1000, 100))).toEqual([
        ['a/b/c/d.ts', 'a/b/e.ts', 'a/f.ts', 'root.ts', 'other.ts'],
      ])
    })

    it('orders groups by first appearance and keeps input order within a group', () => {
      const chunks = [chunk('x/1.ts', 1), chunk('y/1.ts', 1), chunk('x/2.ts', 1), chunk('y/2.ts', 1)]
      expect(paths(planShards(chunks, 1000, 100))).toEqual([['x/1.ts', 'x/2.ts', 'y/1.ts', 'y/2.ts']])
    })

    it('starts a new shard rather than splitting a group that would fit on its own', () => {
      const chunks = [chunk('a/1.ts', 60), chunk('b/1.ts', 30), chunk('b/2.ts', 30)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('starts a new shard when adding a group would exceed maxFiles', () => {
      const chunks = [chunk('a/1.ts', 1), chunk('a/2.ts', 1), chunk('b/1.ts', 1), chunk('b/2.ts', 1)]
      expect(paths(planShards(chunks, 1000, 3))).toEqual([['a/1.ts', 'a/2.ts'], ['b/1.ts', 'b/2.ts']])
    })
  })

  describe('splitting large groups', () => {
    it('splits a group larger than maxFiles', () => {
      const chunks = Array.from({ length: 5 }, (_, i) => chunk(`a/${i}.ts`, 1))
      expect(planShards(chunks, 1000, 2).map((s) => s.length)).toEqual([2, 2, 1])
    })

    it('splits a group larger than the line budget', () => {
      const chunks = [chunk('a/1.ts', 40), chunk('a/2.ts', 40), chunk('a/3.ts', 40)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts']])
    })

    it('gives an oversized single file its own shard', () => {
      const chunks = [chunk('a/small.ts', 10), chunk('b/huge.ts', 500), chunk('c/small.ts', 10)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a/small.ts'], ['b/huge.ts'], ['c/small.ts']])
    })
  })

  describe('limits', () => {
    it('never exceeds maxFiles per shard', () => {
      const chunks = Array.from({ length: 30 }, (_, i) => chunk(`g${i % 5}/f${i}.ts`, 1))
      for (const shard of planShards(chunks, 1000, 4)) expect(shard.length).toBeLessThanOrEqual(4)
    })

    it('never exceeds the line budget unless a single file is larger than it', () => {
      const chunks = Array.from({ length: 30 }, (_, i) => chunk(`g${i % 5}/f${i}.ts`, (i * 13) % 50 + 1))
      for (const shard of planShards(chunks, 80, 100)) {
        const total = shard.reduce((n, c) => n + c.lines, 0)
        if (shard.length > 1) expect(total).toBeLessThanOrEqual(80)
      }
    })

    it('allows a shard to fill the budget exactly', () => {
      const chunks = [chunk('a/1.ts', 50), chunk('a/2.ts', 50)]
      expect(paths(planShards(chunks, 100, 10))).toEqual([['a/1.ts', 'a/2.ts']])
    })

    it('allows a shard to hold exactly maxFiles', () => {
      const chunks = [chunk('a/1.ts', 1), chunk('a/2.ts', 1), chunk('a/3.ts', 1)]
      expect(paths(planShards(chunks, 1000, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts']])
    })
  })
})
