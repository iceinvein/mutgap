import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: '', lines }
}

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single file in a single shard', () => {
    const a = chunk('a.ts', 5)
    expect(planShards([a], 100, 10)).toEqual([[a]])
  })

  it('keeps files under budget and maxFiles in one shard', () => {
    const a = chunk('a.ts', 3)
    const b = chunk('b.ts', 3)
    expect(planShards([a, b], 100, 10)).toEqual([[a, b]])
  })

  it('groups files by directory capped at two segments, ordered by group first appearance', () => {
    const x1 = chunk('z/y/x1.ts', 1)
    const root1 = chunk('root1.ts', 1)
    const x2 = chunk('z/y/w/x2.ts', 1)
    const root2 = chunk('root2.ts', 1)
    const x3 = chunk('z/x3.ts', 1)

    const result = planShards([x1, root1, x2, root2, x3], 1000, 1000)

    expect(result).toEqual([[x1, x2, root1, root2, x3]])
  })

  it('treats a file with no slash as group "."', () => {
    const a = chunk('a.ts', 1)
    const b = chunk('b.ts', 1)
    // both belong to group '.', so they stay adjacent and together
    expect(planShards([a, b], 1000, 1000)).toEqual([[a, b]])
  })

  it('allows a shard total exactly equal to budget', () => {
    const a = chunk('a.ts', 6)
    const b = chunk('b.ts', 4)
    const c = chunk('c.ts', 1)
    // a+b = 10 (== budget, allowed); c would make it 11 (> budget), so it starts a new shard
    const result = planShards([a, b, c], 10, 1000)
    expect(result).toEqual([[a, b], [c]])
  })

  it('allows a shard file count exactly equal to maxFiles', () => {
    const a = chunk('a.ts', 1)
    const b = chunk('b.ts', 1)
    const c = chunk('c.ts', 1)
    const result = planShards([a, b, c], 1000, 2)
    expect(result).toEqual([[a, b], [c]])
  })

  it('gives a single file larger than budget its own shard without dropping it', () => {
    const a = chunk('a.ts', 3)
    const big = chunk('big.ts', 10)
    const c = chunk('c.ts', 2)
    const result = planShards([a, big, c], 5, 1000)
    expect(result).toEqual([[a], [big], [c]])
  })

  it('splits files across shards purely by maxFiles when budget is generous', () => {
    const files = [chunk('a.ts', 1), chunk('b.ts', 1), chunk('c.ts', 1), chunk('d.ts', 1)]
    const result = planShards(files, 1000, 2)
    expect(result).toEqual([[files[0], files[1]], [files[2], files[3]]])
  })

  it('closes the current shard before starting a new group if the whole group would not fit', () => {
    const a1 = chunk('a1.ts', 4) // group '.'
    const b1 = chunk('dir/b1.ts', 5) // group 'dir'
    const b2 = chunk('dir/b2.ts', 4) // group 'dir', group total = 9
    // shard1 gets a1 (4 lines). Group 'dir' totals 9 lines; 4 + 9 = 13 > budget(10),
    // so the whole group is pushed to a fresh shard rather than splitting b1 into shard1.
    const result = planShards([a1, b1, b2], 10, 1000)
    expect(result).toEqual([[a1], [b1, b2]])
  })

  it('can still split a large group across shards file-by-file once it is filling its own shard', () => {
    const b1 = chunk('dir/b1.ts', 6)
    const b2 = chunk('dir/b2.ts', 6)
    // same group 'dir'; budget 10 means b1 and b2 cannot share a shard
    const result = planShards([b1, b2], 10, 1000)
    expect(result).toEqual([[b1], [b2]])
  })

  it('caps grouping at two path segments', () => {
    const deep1 = chunk('a/b/c/x.ts', 1)
    const deep2 = chunk('a/b/d/y.ts', 1)
    const shallow = chunk('a/z.ts', 1)
    // deep1 and deep2 share group 'a/b'; shallow is group 'a' (different group, appears later)
    const result = planShards([deep1, shallow, deep2], 1000, 1000)
    expect(result).toEqual([[deep1, deep2, shallow]])
  })

  it('never produces an empty shard', () => {
    const files = [chunk('a.ts', 1), chunk('b.ts', 1), chunk('c.ts', 1)]
    const result = planShards(files, 1, 1)
    for (const shard of result) {
      expect(shard.length).toBeGreaterThan(0)
    }
  })
})
