import { describe, it, expect } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: `${path}:${lines}`, lines }
}

function paths(shards: FileChunk[][]): string[][] {
  return shards.map((s) => s.map((c) => c.path))
}

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single file in its own shard', () => {
    const a = chunk('a.ts', 5)
    const result = planShards([a], 100, 10)
    expect(result).toEqual([[a]])
  })

  it('keeps files together when well under budget and maxFiles', () => {
    const chunks = [chunk('a.ts', 5), chunk('b.ts', 5), chunk('c.ts', 5)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([chunks])
  })

  it('never drops or mutates chunk data', () => {
    const chunks = [chunk('a.ts', 5), chunk('b.ts', 5)]
    const result = planShards(chunks, 100, 10)
    expect(result.flat()).toEqual(chunks)
  })

  it('gives a single oversized file its own shard rather than dropping it', () => {
    const big = chunk('huge.ts', 500)
    const result = planShards([big], 10, 10)
    expect(result).toEqual([[big]])
  })

  describe('grouping', () => {
    it('groups a top-level file (no slash) under "." with other top-level files', () => {
      const chunks = [chunk('a/x.ts', 1), chunk('root.ts', 1), chunk('a/y.ts', 1)]
      const result = paths(planShards(chunks, 100, 10))
      // group "a" first-appears before group "." -> a's files stay adjacent, "." comes after
      expect(result).toEqual([['a/x.ts', 'a/y.ts', 'root.ts']])
    })

    it('caps group depth at two segments, so a/b/x.ts and a/b/c/x.ts share a group', () => {
      const chunks = [chunk('a/b/one.ts', 1), chunk('top.ts', 1), chunk('a/b/c/two.ts', 1)]
      const result = paths(planShards(chunks, 100, 10))
      expect(result).toEqual([['a/b/one.ts', 'a/b/c/two.ts', 'top.ts']])
    })

    it('treats a/b/x.ts and a/c/x.ts as different groups', () => {
      const chunks = [chunk('a/b/one.ts', 1), chunk('a/c/two.ts', 1), chunk('a/b/three.ts', 1)]
      const result = paths(planShards(chunks, 100, 10))
      // group "a/b" first-appears first, so its files (one, three) are pulled together
      // ahead of group "a/c" (two), even though "two" appeared earlier in the input
      expect(result).toEqual([['a/b/one.ts', 'a/b/three.ts', 'a/c/two.ts']])
    })

    it('orders groups by first appearance and preserves within-group input order', () => {
      const chunks = [
        chunk('b/1.ts', 1),
        chunk('a/1.ts', 1),
        chunk('b/2.ts', 1),
        chunk('a/2.ts', 1),
      ]
      const result = paths(planShards(chunks, 100, 10))
      expect(result).toEqual([['b/1.ts', 'b/2.ts', 'a/1.ts', 'a/2.ts']])
    })
  })

  describe('budget', () => {
    it('starts a new shard when adding a whole group would exceed the budget', () => {
      // group "a" = 8 lines fits alone; group "b" totals 4 more, which would push
      // the shard to 12 > 10, so "b" must start fresh even though its first file
      // alone (8+2=10) would not overflow.
      const chunks = [chunk('a/one.ts', 8), chunk('b/two.ts', 2), chunk('b/three.ts', 2)]
      const result = planShards(chunks, 10, 100)
      expect(result).toEqual([[chunks[0]], [chunks[1], chunks[2]]])
    })

    it('splits within a group once adding the next file would exceed the budget', () => {
      const chunks = [chunk('a/one.ts', 6), chunk('a/two.ts', 6), chunk('a/three.ts', 1)]
      const result = planShards(chunks, 10, 100)
      expect(result).toEqual([[chunks[0]], [chunks[1], chunks[2]]])
    })

    it('allows a shard whose total lands exactly on the budget', () => {
      const chunks = [chunk('a/one.ts', 5), chunk('a/two.ts', 5)]
      const result = planShards(chunks, 10, 100)
      expect(result).toEqual([chunks])
    })

    it('gives an oversized file within a group its own shard without dropping siblings', () => {
      const chunks = [chunk('a/small.ts', 2), chunk('a/huge.ts', 50), chunk('a/other.ts', 2)]
      const result = planShards(chunks, 10, 100)
      expect(result.flat()).toEqual(chunks)
      expect(result.some((s) => s.length === 1 && s[0].path === 'a/huge.ts')).toBe(true)
    })
  })

  describe('maxFiles', () => {
    it('starts a new shard when adding a whole group would exceed maxFiles', () => {
      const chunks = [chunk('a/one.ts', 1), chunk('b/two.ts', 1), chunk('b/three.ts', 1)]
      const result = planShards(chunks, 1000, 2)
      expect(result).toEqual([[chunks[0]], [chunks[1], chunks[2]]])
    })

    it('splits within a group once adding the next file would exceed maxFiles', () => {
      const chunks = [chunk('a/one.ts', 1), chunk('a/two.ts', 1), chunk('a/three.ts', 1)]
      const result = planShards(chunks, 1000, 2)
      expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
    })

    it('allows a shard with exactly maxFiles files', () => {
      const chunks = [chunk('a/one.ts', 1), chunk('a/two.ts', 1)]
      const result = planShards(chunks, 1000, 2)
      expect(result).toEqual([chunks])
    })
  })

  it('combines budget and maxFiles constraints across many groups', () => {
    const chunks = [
      chunk('a/1.ts', 4),
      chunk('a/2.ts', 4),
      chunk('b/1.ts', 3),
      chunk('c/1.ts', 1),
      chunk('c/2.ts', 1),
      chunk('c/3.ts', 1),
    ]
    const result = planShards(chunks, 8, 2)
    // shard1: a/1(4)+a/2(4)=8 lines, 2 files -> at both caps, closes before "b"
    // shard2: b/1(3) alone; adding c's group (3 files) would exceed maxFiles=2, closes
    // shard3: c/1, c/2 -> adding c/3 would exceed maxFiles=2, closes
    // shard4: c/3
    expect(result).toEqual([
      [chunks[0], chunks[1]],
      [chunks[2]],
      [chunks[3], chunks[4]],
      [chunks[5]],
    ])
  })
})
