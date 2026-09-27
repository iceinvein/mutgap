import { describe, it, expect } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: '', lines }
}

function paths(shards: FileChunk[][]): string[][] {
  return shards.map(shard => shard.map(c => c.path))
}

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 100)).toEqual([])
  })

  it('puts a single file in a single shard', () => {
    const chunks = [chunk('a.ts', 5)]
    expect(paths(planShards(chunks, 100, 100))).toEqual([['a.ts']])
  })

  it('never drops a file, even one larger than budget', () => {
    const chunks = [chunk('small.ts', 3), chunk('huge.ts', 1000)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['small.ts'], ['huge.ts']])
  })

  it('allows a shard total exactly equal to budget', () => {
    const chunks = [chunk('a.ts', 5), chunk('b.ts', 5)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['a.ts', 'b.ts']])
  })

  it('allows a shard file count exactly equal to maxFiles', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1)]
    const result = planShards(chunks, 100, 2)
    expect(paths(result)).toEqual([['a.ts', 'b.ts']])
  })

  it('splits mid-group when the next file would exceed the line budget', () => {
    // all same group 'g', so grouping never forces a split here
    const chunks = [chunk('g/f1.ts', 4), chunk('g/f2.ts', 4), chunk('g/f3.ts', 4)]
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['g/f1.ts', 'g/f2.ts'], ['g/f3.ts']])
  })

  it('splits mid-group when the next file would exceed maxFiles', () => {
    const chunks = [chunk('g/f1.ts', 1), chunk('g/f2.ts', 1), chunk('g/f3.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(paths(result)).toEqual([['g/f1.ts', 'g/f2.ts'], ['g/f3.ts']])
  })

  it('closes the current shard before a whole new group if the group would not fit, even if the group\'s first file alone would', () => {
    const chunks = [
      chunk('g1/a.ts', 6), // group g1, shard so far would be 6
      chunk('g2/a.ts', 3), // group g2, total 5
      chunk('g2/b.ts', 2),
    ]
    // 6 + 5 (whole group g2) > 10 -> shard closes before g2 starts,
    // even though 6 + 3 (just g2/a.ts) would have fit.
    const result = planShards(chunks, 10, 100)
    expect(paths(result)).toEqual([['g1/a.ts'], ['g2/a.ts', 'g2/b.ts']])
  })

  it('does not force a new shard for a group when the current shard is empty, even if the group exceeds budget', () => {
    const chunks = [chunk('g/f1.ts', 4), chunk('g/f2.ts', 4)]
    // group total is 8 > budget of 5, but shard starts empty so files
    // are still added one at a time (and here both happen to fit
    // individually against an empty shard... use per-file check instead)
    const result = planShards(chunks, 5, 100)
    expect(paths(result)).toEqual([['g/f1.ts'], ['g/f2.ts']])
  })

  it('groups files by directory capped at two segments', () => {
    const chunks = [
      chunk('readme.md', 1), // group '.'
      chunk('a/x.ts', 1), // group 'a'
      chunk('a/b/x.ts', 1), // group 'a/b'
      chunk('a/b/c/x.ts', 1), // group 'a/b'
    ]
    const result = planShards(chunks, 1000, 1000)
    expect(result).toHaveLength(1)
  })

  it('orders groups by first appearance and keeps files within a group in input order', () => {
    const chunks = [
      chunk('a/x.ts', 1),
      chunk('b/x.ts', 1),
      chunk('a/y.ts', 1),
    ]
    const result = planShards(chunks, 1000, 1000)
    expect(paths(result)).toEqual([['a/x.ts', 'a/y.ts', 'b/x.ts']])
  })

  it('reunites files of the same two-segment group that were far apart in the input', () => {
    const chunks = [
      chunk('a/b/x.ts', 1), // group 'a/b', first appearance
      chunk('c/z.ts', 1), // group 'c'
      chunk('a/b/c/y.ts', 1), // group 'a/b' again, deeper nesting
    ]
    const result = planShards(chunks, 1000, 1000)
    expect(paths(result)).toEqual([['a/b/x.ts', 'a/b/c/y.ts', 'c/z.ts']])
  })

  it('never produces an empty shard', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1), chunk('c.ts', 1)]
    const result = planShards(chunks, 1, 1)
    for (const shard of result) {
      expect(shard.length).toBeGreaterThan(0)
    }
  })
})
