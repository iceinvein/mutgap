import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number, text = ''): FileChunk {
  return { path, text, lines }
}

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single file in a single shard', () => {
    const a = chunk('a.ts', 5)
    expect(planShards([a], 100, 10)).toEqual([[a]])
  })

  describe('grouping', () => {
    it('groups a file with no slash under "."', () => {
      const a = chunk('a.ts', 1)
      const b = chunk('b.ts', 1)
      const result = planShards([a, b], 100, 10)
      expect(result).toEqual([[a, b]])
    })

    it('groups a/x.ts under "a"', () => {
      const x = chunk('a/x.ts', 1)
      const y = chunk('a/y.ts', 1)
      const result = planShards([x, y], 100, 10)
      expect(result).toEqual([[x, y]])
    })

    it('groups a/b/x.ts and a/b/c/x.ts both under "a/b"', () => {
      const x = chunk('a/b/x.ts', 1)
      const y = chunk('a/b/c/x.ts', 1)
      const result = planShards([x, y], 100, 10)
      expect(result).toEqual([[x, y]])
    })

    it('reorders far-apart files of the same group to be adjacent', () => {
      // root.ts (group ".") sits between the two "a" files in the input,
      // but the "a" group must end up contiguous.
      const a1 = chunk('a/x.ts', 1)
      const root = chunk('root.ts', 1)
      const a2 = chunk('a/y.ts', 1)
      const result = planShards([a1, root, a2], 100, 10)
      // group "a" appeared first (via a1), so it comes first, keeping a1
      // before a2 (input order within the group); "." group follows.
      expect(result).toEqual([[a1, a2, root]])
    })

    it('orders groups by first appearance in the input', () => {
      const root = chunk('root.ts', 1)
      const a = chunk('a/x.ts', 1)
      const b = chunk('b/x.ts', 1)
      // input order: b, root, a -> groups first seen in order b, ".", a
      const result = planShards([b, root, a], 100, 10)
      expect(result).toEqual([[b, root, a]])
    })
  })

  describe('budget (lines)', () => {
    it('keeps a shard whose total is exactly the budget in one shard', () => {
      const a = chunk('a.ts', 5)
      const b = chunk('a/b.ts', 5) // different group than "a.ts" (group ".") so
      // this also exercises group-level packing, not just file-level.
      const result = planShards([a, b], 10, 100)
      expect(result).toEqual([[a, b]])
    })

    it('starts a new shard once a file would push the total over budget', () => {
      const a = chunk('a.ts', 5)
      const b = chunk('b.ts', 6) // 5 + 6 = 11 > 10
      const result = planShards([a, b], 10, 100)
      expect(result).toEqual([[a], [b]])
    })

    it('gives an oversized single file its own shard instead of dropping it', () => {
      const small = chunk('a.ts', 2)
      const huge = chunk('b.ts', 50)
      const result = planShards([small, huge], 10, 100)
      expect(result).toEqual([[small], [huge]])
    })

    it('closes the current shard before a whole group that would not fit', () => {
      // group "." (root.ts) fills most of the budget; group "a" (two files)
      // would push the running total over budget as a whole, so it must
      // start its own shard rather than being appended file-by-file.
      const root = chunk('root.ts', 8)
      const ax = chunk('a/x.ts', 2)
      const ay = chunk('a/y.ts', 2)
      const result = planShards([root, ax, ay], 10, 100)
      expect(result).toEqual([[root], [ax, ay]])
    })

    it('splits a group across shards file-by-file if the group itself is too big for one shard', () => {
      const ax = chunk('a/x.ts', 6)
      const ay = chunk('a/y.ts', 6) // group total 12 > budget of 10
      const result = planShards([ax, ay], 10, 100)
      expect(result).toEqual([[ax], [ay]])
    })
  })

  describe('maxFiles', () => {
    it('keeps a shard with exactly maxFiles files in one shard', () => {
      const a = chunk('a.ts', 1)
      const b = chunk('b.ts', 1)
      const result = planShards([a, b], 100, 2)
      expect(result).toEqual([[a, b]])
    })

    it('starts a new shard once a file would push file count over maxFiles', () => {
      const a = chunk('a.ts', 1)
      const b = chunk('b.ts', 1)
      const c = chunk('c.ts', 1)
      const result = planShards([a, b, c], 100, 2)
      expect(result).toEqual([[a, b], [c]])
    })

    it('closes the current shard before a whole group that would exceed maxFiles', () => {
      const root = chunk('root.ts', 1)
      const ax = chunk('a/x.ts', 1)
      const ay = chunk('a/y.ts', 1)
      const result = planShards([root, ax, ay], 100, 2)
      expect(result).toEqual([[root], [ax, ay]])
    })

    it('splits a group across shards file-by-file if the group itself exceeds maxFiles', () => {
      const ax = chunk('a/x.ts', 1)
      const ay = chunk('a/y.ts', 1)
      const az = chunk('a/z.ts', 1) // group has 3 files, maxFiles is 2
      const result = planShards([ax, ay, az], 100, 2)
      expect(result).toEqual([[ax, ay], [az]])
    })
  })

  it('never produces an empty shard', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 100), chunk('c.ts', 1)]
    const result = planShards(chunks, 5, 100)
    for (const shard of result) {
      expect(shard.length).toBeGreaterThan(0)
    }
  })

  it('preserves input order of files within a shard', () => {
    const a = chunk('z.ts', 1)
    const b = chunk('m.ts', 1)
    const result = planShards([a, b], 100, 100)
    expect(result[0]).toEqual([a, b])
  })
})
