import { describe, expect, test } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: `// ${path}`, lines }
}

function paths(shards: FileChunk[][]): string[][] {
  return shards.map((shard) => shard.map((c) => c.path))
}

describe('planShards', () => {
  test('returns [] for empty input', () => {
    expect(planShards([], 100, 100)).toEqual([])
  })

  test('single file within budget goes into one shard', () => {
    const chunks = [chunk('a.ts', 5)]
    const result = planShards(chunks, 100, 100)
    expect(paths(result)).toEqual([['a.ts']])
  })

  test('a single file larger than budget still gets its own shard', () => {
    const chunks = [chunk('big.ts', 50)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['big.ts']])
    expect(result[0][0].lines).toBe(50)
  })

  test('no file is ever dropped, even when oversized', () => {
    const chunks = [chunk('small.ts', 3), chunk('huge.ts', 50), chunk('small2.ts', 2)]
    const result = planShards(chunks, 10, 100)
    const flat = result.flat().map((c) => c.path)
    expect(flat.sort()).toEqual(['huge.ts', 'small.ts', 'small2.ts'].sort())
  })

  test('groups files by directory capped at two segments', () => {
    // root file -> group '.', one segment -> group 'a', deep paths -> group 'a/b'
    const chunks = [
      chunk('root.ts', 1),
      chunk('a/x.ts', 1),
      chunk('a/b/x.ts', 1),
      chunk('a/b/c/x.ts', 1),
    ]
    const result = planShards(chunks, 1000, 1000)
    // all fit in one shard/budget, but confirm grouping keeps a/b/x.ts and a/b/c/x.ts adjacent
    expect(paths(result)).toEqual([['root.ts', 'a/x.ts', 'a/b/x.ts', 'a/b/c/x.ts']])
  })

  test('reorders files so the same group is contiguous, ordered by group first-appearance', () => {
    const chunks = [
      chunk('a/x.ts', 1),
      chunk('b/y.ts', 1),
      chunk('a/z.ts', 1), // same group as a/x.ts, but appears later in input
      chunk('b/w.ts', 1),
    ]
    const result = planShards(chunks, 1000, 1000)
    // group 'a' first appeared before group 'b', so all of 'a' comes first,
    // and within each group, input order is preserved
    expect(paths(result)).toEqual([['a/x.ts', 'a/z.ts', 'b/y.ts', 'b/w.ts']])
  })

  test('files within a group keep their original relative order', () => {
    const chunks = [chunk('a/b.ts', 1), chunk('a/a.ts', 1), chunk('a/c.ts', 1)]
    const result = planShards(chunks, 1000, 1000)
    expect(paths(result)).toEqual([['a/b.ts', 'a/a.ts', 'a/c.ts']])
  })

  test('a shard exactly at the line budget is not split further', () => {
    const chunks = [chunk('a.ts', 5), chunk('b.ts', 5)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a.ts', 'b.ts']])
  })

  test('a shard exactly at maxFiles is not split further', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(paths(result)).toEqual([['a.ts', 'b.ts']])
  })

  test('splits mid-group when the next file would exceed the line budget', () => {
    // group 'a' has three 4-line files; budget 10
    // a.ts (4) -> shard=4; b.ts (4) -> shard=8 (fits); c.ts (4) -> 12 > 10, closes shard first
    const chunks = [chunk('a/a.ts', 4), chunk('a/b.ts', 4), chunk('a/c.ts', 4)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a/a.ts', 'a/b.ts'], ['a/c.ts']])
  })

  test('splits mid-group when the next file would exceed maxFiles', () => {
    const chunks = [chunk('a/a.ts', 1), chunk('a/b.ts', 1), chunk('a/c.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(paths(result)).toEqual([['a/a.ts', 'a/b.ts'], ['a/c.ts']])
  })

  test('starts a fresh shard for a new group when the whole group would overflow the line budget', () => {
    // group 'a' totals 8 lines, group 'b' totals 5 lines; budget 10.
    // Current shard (8 lines) is non-empty, and 8 + 5 = 13 > 10, so group 'b'
    // starts its own shard rather than splitting mid-group unnecessarily.
    const chunks = [chunk('a/x.ts', 5), chunk('a/y.ts', 3), chunk('b/z.ts', 5)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a/x.ts', 'a/y.ts'], ['b/z.ts']])
  })

  test('starts a fresh shard for a new group when the whole group would overflow maxFiles', () => {
    const chunks = [chunk('a/x.ts', 1), chunk('a/y.ts', 1), chunk('b/z.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(paths(result)).toEqual([['a/x.ts', 'a/y.ts'], ['b/z.ts']])
  })

  test('keeps a group together in one shard when it fits, even if added to a non-empty shard', () => {
    // group 'a' (4 lines) then group 'b' (5 lines); budget 10 -> 4 + 5 = 9, fits together
    const chunks = [chunk('a/x.ts', 4), chunk('b/y.ts', 5)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a/x.ts', 'b/y.ts']])
  })

  test('does not close an empty shard even if the group alone would exceed the budget', () => {
    // first group has a single oversized file; since the shard starts empty,
    // the group-level pre-check is skipped and the file is placed anyway
    const chunks = [chunk('a/big.ts', 50), chunk('b/small.ts', 2)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a/big.ts'], ['b/small.ts']])
  })

  test('an oversized file forces the next group into a new shard', () => {
    const chunks = [chunk('a/big.ts', 20), chunk('b/small.ts', 5)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a/big.ts'], ['b/small.ts']])
  })

  test('resulting shards never contain an empty array', () => {
    const chunks = [chunk('a/a.ts', 4), chunk('a/b.ts', 4), chunk('a/c.ts', 4), chunk('b/d.ts', 1)]
    const result = planShards(chunks, 10, 100)
    for (const shard of result) {
      expect(shard.length).toBeGreaterThan(0)
    }
  })
})
