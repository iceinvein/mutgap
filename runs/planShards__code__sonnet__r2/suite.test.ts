import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: '', lines }
}

describe('planShards', () => {
  it('returns no shards for an empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single chunk into a single shard', () => {
    const chunks = [chunk('a.ts', 10)]
    expect(planShards(chunks, 100, 10)).toEqual([[chunk('a.ts', 10)]])
  })

  it('keeps chunks together when well within budget and maxFiles', () => {
    const chunks = [chunk('a.ts', 10), chunk('b.ts', 20), chunk('c.ts', 5)]
    expect(planShards(chunks, 100, 10)).toEqual([chunks])
  })

  it('splits into a new shard once the line budget is exceeded', () => {
    const chunks = [chunk('a.ts', 40), chunk('b.ts', 40), chunk('c.ts', 40)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('flushes as soon as cumulative lines reach the budget (>=)', () => {
    // a.ts (10) + b.ts (10) == budget of 20, which should trigger a flush before b.ts
    const chunks = [chunk('a.ts', 10), chunk('b.ts', 10)]
    const result = planShards(chunks, 20, 10)
    expect(result).toEqual([[chunks[0]], [chunks[1]]])
  })

  it('splits into a new shard once maxFiles is exceeded', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1), chunk('c.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('puts every chunk in its own shard when maxFiles is 1', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1), chunk('c.ts', 1)]
    const result = planShards(chunks, 1000, 1)
    expect(result).toEqual([[chunks[0]], [chunks[1]], [chunks[2]]])
  })

  it('always includes an oversized single chunk even if it alone exceeds the budget', () => {
    const chunks = [chunk('huge.ts', 500), chunk('small.ts', 5)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0]], [chunks[1]]])
  })

  it('groups files that share the same top-level directory before flushing on file count', () => {
    // "src/a.ts" and "src/b.ts" share group key "src", so the group-level
    // pre-check considers them together and flushes them as a unit ahead of "lib/c.ts".
    const chunks = [chunk('src/a.ts', 1), chunk('src/b.ts', 1), chunk('lib/c.ts', 1)]
    const result = planShards(chunks, 1000, 2)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('flushes an entire group up front when the group as a whole would exceed the budget', () => {
    // group "src" (src/a.ts + src/b.ts) totals 60 lines, which alone is fine,
    // but adding it to an existing non-empty shard would exceed the budget of 50.
    const chunks = [chunk('root.ts', 20), chunk('src/a.ts', 30), chunk('src/b.ts', 30)]
    const result = planShards(chunks, 50, 10)
    expect(result[0]).toEqual([chunks[0]])
    expect(result.flat()).toEqual(chunks)
  })

  it('splits a single oversized group across multiple shards when it exceeds the budget by itself', () => {
    const chunks = [chunk('src/a.ts', 40), chunk('src/b.ts', 40), chunk('src/c.ts', 40)]
    const result = planShards(chunks, 100, 10)
    expect(result).toEqual([[chunks[0], chunks[1]], [chunks[2]]])
  })

  it('treats files with no directory component as their own "." group', () => {
    const chunks = [chunk('a.ts', 1), chunk('b.ts', 1)]
    const result = planShards(chunks, 1000, 10)
    expect(result).toEqual([chunks])
  })

  it('preserves chunk order within and across shards', () => {
    const chunks = [
      chunk('a/x.ts', 5),
      chunk('a/y.ts', 5),
      chunk('b/z.ts', 5),
      chunk('c/w.ts', 5),
    ]
    const result = planShards(chunks, 1000, 10)
    expect(result.flat()).toEqual(chunks)
  })
})
