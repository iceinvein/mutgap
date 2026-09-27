import { describe, it, expect } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const c = (path: string, lines: number): FileChunk => ({ path, text: '', lines })

const flat = (shards: FileChunk[][]) => shards.flat()

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single file in its own shard', () => {
    const a = c('a.ts', 5)
    expect(planShards([a], 100, 10)).toEqual([[a]])
  })

  it('never drops files, regardless of splitting', () => {
    const chunks = [c('a.ts', 3), c('b.ts', 4), c('c.ts', 2), c('d.ts', 6)]
    const shards = planShards(chunks, 5, 10)
    expect(flat(shards)).toEqual(chunks)
  })

  describe('grouping', () => {
    it('groups a path with no slash under "."', () => {
      const a = c('x.ts', 1)
      const b = c('y.ts', 1)
      const shards = planShards([a, b], 100, 10)
      expect(shards).toEqual([[a, b]])
    })

    it('caps a group at two directory segments, so deeper paths share a group', () => {
      // a/b/x.ts -> group 'a/b'; a/b/c/y.ts -> also group 'a/b' (capped)
      const other = c('other/o.ts', 1)
      const deep1 = c('a/b/x.ts', 1)
      const deep2 = c('a/b/c/y.ts', 1)
      // interleave an unrelated group between the two same-group files
      const shards = planShards([deep1, other, deep2], 100, 10)
      // deep1 and deep2 share group 'a/b' which appears first, so they stay
      // adjacent ahead of the 'other' group despite the interleaving.
      expect(shards).toEqual([[deep1, deep2, other]])
    })

    it('orders groups by first appearance and keeps files within a group in input order', () => {
      const a1 = c('a/one.ts', 1)
      const b1 = c('b/x.ts', 1)
      const a2 = c('a/two.ts', 1)
      const b2 = c('b/y.ts', 1)
      const shards = planShards([a1, b1, a2, b2], 100, 10)
      expect(shards).toEqual([[a1, a2, b1, b2]])
    })
  })

  describe('budget: group-level pre-check', () => {
    it('flushes a non-empty shard before a group if the whole group would exceed budget', () => {
      const a1 = c('a/one.ts', 3)
      const b1 = c('b/one.ts', 3)
      const b2 = c('b/two.ts', 3)
      // group a total = 3, group b total = 6; after a1, current=3
      // adding whole group b (6) would make 3+6=9 > budget(5), so flush first
      const shards = planShards([a1, b1, b2], 5, 100)
      expect(shards).toEqual([[a1], [b1], [b2]])
    })

    it('does not flush for a group that fits exactly at budget', () => {
      const a1 = c('a/one.ts', 3)
      const b1 = c('b/one.ts', 2)
      // group b total = 2; 3+2 = 5 == budget, not over, so no flush needed
      const shards = planShards([a1, b1], 5, 100)
      expect(shards).toEqual([[a1, b1]])
    })
  })

  describe('maxFiles: group-level pre-check', () => {
    it('flushes a non-empty shard before a group if the whole group would exceed maxFiles', () => {
      const a1 = c('a/one.ts', 1)
      const b1 = c('b/one.ts', 1)
      const b2 = c('b/two.ts', 1)
      // current has 1 file; group b has 2 files; 1+2=3 > maxFiles(2)
      const shards = planShards([a1, b1, b2], 1000, 2)
      expect(shards).toEqual([[a1], [b1, b2]])
    })
  })

  describe('per-file checks', () => {
    it('closes the shard once adding the next file would exceed budget', () => {
      const a = c('a.ts', 5)
      const b = c('b.ts', 5)
      // 5 + 5 = 10 > budget(9), strictly over -> new shard
      const shards = planShards([a, b], 9, 100)
      expect(shards).toEqual([[a], [b]])
    })

    it('allows a shard whose total is exactly budget', () => {
      const a = c('a.ts', 5)
      const b = c('b.ts', 5)
      // 5 + 5 = 10 == budget, exactly at budget is allowed per spec, not "over"
      const shards = planShards([a, b], 10, 100)
      expect(shards).toEqual([[a, b]])
    })

    it('closes the shard once adding the next file would exceed maxFiles', () => {
      const a = c('a.ts', 1)
      const b = c('b.ts', 1)
      const shards = planShards([a, b], 1000, 1)
      expect(shards).toEqual([[a], [b]])
    })

    it('allows a shard whose file count is exactly maxFiles', () => {
      const a = c('a.ts', 1)
      const b = c('b.ts', 1)
      const shards = planShards([a, b], 1000, 2)
      expect(shards).toEqual([[a, b]])
    })
  })

  describe('oversized single files', () => {
    it('gives a file larger than budget its own shard rather than dropping it', () => {
      const big = c('big.ts', 1000)
      const shards = planShards([big], 10, 10)
      expect(shards).toEqual([[big]])
    })

    it('starts a fresh shard for files following an oversized file', () => {
      const big = c('big.ts', 1000)
      const small = c('small.ts', 1)
      const shards = planShards([big, small], 10, 10)
      expect(shards).toEqual([[big], [small]])
    })
  })
})
