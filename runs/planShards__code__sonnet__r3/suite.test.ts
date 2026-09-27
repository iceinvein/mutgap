import { describe, it, expect } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number, text = ''): FileChunk {
  return { path, text, lines }
}

describe('planShards', () => {
  it('returns no shards for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single chunk into a single shard', () => {
    const c = chunk('a.txt', 10)
    expect(planShards([c], 100, 10)).toEqual([[c]])
  })

  it('keeps chunks together when they fit within budget and maxFiles', () => {
    const chunks = [chunk('a.txt', 10), chunk('b.txt', 10), chunk('c.txt', 10)]
    expect(planShards(chunks, 100, 10)).toEqual([chunks])
  })

  it('groups files in the same top-level directory together', () => {
    const chunks = [
      chunk('dir/a.txt', 10),
      chunk('other/x.txt', 10),
      chunk('dir/b.txt', 10),
    ]
    // dir/a.txt and dir/b.txt share a group key ('dir') and are visited together
    // since Map preserves first-seen insertion order of groups.
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[2], chunks[1]]])
  })

  it('groups files sharing the first two path components together', () => {
    const chunks = [
      chunk('a/b/one.txt', 10),
      chunk('a/c/two.txt', 10),
      chunk('a/b/three.txt', 10),
    ]
    // 'a/b/one.txt' and 'a/b/three.txt' -> group 'a/b'; 'a/c/two.txt' -> group 'a/c'
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[2], chunks[1]]])
  })

  it('splits into a new shard once the line budget would be exceeded', () => {
    const chunks = [chunk('a.txt', 50), chunk('b.txt', 60)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0]], [chunks[1]]])
  })

  it('flushes exactly at the budget boundary (per-chunk check is >=)', () => {
    const chunks = [chunk('a.txt', 40), chunk('b.txt', 60)]
    // currentLines(40) + c.lines(60) >= budget(100) -> flush before adding b
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0]], [chunks[1]]])
  })

  it('does not flush when the sum is strictly under budget', () => {
    const chunks = [chunk('a.txt', 40), chunk('b.txt', 59)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[1]]])
  })

  it('splits into a new shard once maxFiles would be exceeded', () => {
    const chunks = [chunk('a.txt', 1), chunk('b.txt', 1), chunk('c.txt', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('places an oversized single chunk alone rather than dropping it', () => {
    const chunks = [chunk('a.txt', 10), chunk('big.txt', 500)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0]], [chunks[1]]])
  })

  it('does not merge a following group into a shard that would exceed budget at the group level', () => {
    const chunks = [
      chunk('dir/a.txt', 10),
      chunk('dir/b.txt', 10),
      chunk('other/x.txt', 90),
    ]
    // first shard: dir/a.txt + dir/b.txt = 20 lines.
    // adding the 'other' group (90 lines) would bring total to 110 > budget(100),
    // so the whole group is flushed to a new shard even though individually
    // 20 + 90 could partially fit under a naive per-chunk-only check.
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('produces multiple shards spanning many groups respecting both constraints', () => {
    const chunks = [
      chunk('a/one.txt', 30),
      chunk('a/two.txt', 30),
      chunk('b/three.txt', 30),
      chunk('c/four.txt', 30),
    ]
    const result = planShards(chunks, 70, 10)
    // group 'a' (60 lines) fills first shard alone (adding group 'b' would exceed 70)
    // group 'b' (30) starts a new shard, group 'c' (30) added -> 60, fits
    expect(result).toEqual([
      [chunks[0], chunks[1]],
      [chunks[2], chunks[3]],
    ])
  })

  it('handles a chunk with zero lines without flushing unnecessarily', () => {
    const chunks = [chunk('a.txt', 0), chunk('b.txt', 0), chunk('c.txt', 0)]
    const result = planShards(chunks, 10, 10)
    expect(result).toEqual([chunks])
  })
})
