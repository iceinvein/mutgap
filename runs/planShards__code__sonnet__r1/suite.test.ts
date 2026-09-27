import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

function chunk(path: string, lines: number): FileChunk {
  return { path, text: '', lines }
}

describe('planShards', () => {
  it('returns no shards for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts a single chunk into a single shard', () => {
    const c = chunk('a.txt', 5)
    expect(planShards([c], 100, 10)).toEqual([[c]])
  })

  it('keeps everything in one shard when budget and maxFiles are ample', () => {
    const chunks = [chunk('a.txt', 5), chunk('dir/b.txt', 5), chunk('dir/c.txt', 5)]
    expect(planShards(chunks, 100, 10)).toEqual([chunks])
  })

  it('orders output by first appearance of each group, preserving order within a group', () => {
    const gx = chunk('g2/x.txt', 1)
    const gy = chunk('g1/y.txt', 1)
    const gz = chunk('g2/z.txt', 1)
    // g2 is seen first (via gx), so its members (gx, gz) come before g1's (gy),
    // even though gy appears before gz in the input.
    expect(planShards([gx, gy, gz], 100, 10)).toEqual([[gx, gz, gy]])
  })

  it('splits into a new shard when adding a whole group would exceed the budget', () => {
    const g1a = chunk('g1/a.txt', 4)
    const g1b = chunk('g1/b.txt', 4)
    const g2a = chunk('g2/a.txt', 4)
    // group g1 totals 8 lines, group g2 totals 4 lines; budget 10 can't fit both groups.
    expect(planShards([g1a, g1b, g2a], 10, 10)).toEqual([[g1a, g1b], [g2a]])
  })

  it('can still split within a group at the member level even when the group itself just started a fresh shard', () => {
    const big1 = chunk('g1/a.txt', 6)
    const big2 = chunk('g1/b.txt', 6)
    const small = chunk('g2/a.txt', 1)
    // group g1 (12 lines) exceeds the budget of 10, but since the shard is
    // empty when g1 starts, the group-level check does not pre-emptively
    // flush; big2 is instead split off by the member-level check (6+6>=10).
    expect(planShards([big1, big2, small], 10, 10)).toEqual([[big1], [big2, small]])
  })

  it('splits a group across shards when maxFiles is exceeded, even with budget to spare', () => {
    const a = chunk('g1/a.txt', 1)
    const b = chunk('g1/b.txt', 1)
    const c = chunk('g1/c.txt', 1)
    expect(planShards([a, b, c], 1000, 2)).toEqual([[a, b], [c]])
  })

  it('flushes at the member level when a chunk would bring the running total to exactly the budget', () => {
    // Member-level check uses >=, unlike the group-level check which uses >.
    const first = chunk('g1/a.txt', 5)
    const second = chunk('g2/a.txt', 5)
    // group g2's total (5) does not exceed budget (10) when added to current (5),
    // so the group-level check alone would not flush; but the member-level
    // check flushes because 5 + 5 >= 10.
    expect(planShards([first, second], 10, 10)).toEqual([[first], [second]])
  })

  it('does not flush at the member level when the running total stays strictly under budget', () => {
    const first = chunk('g1/a.txt', 4)
    const second = chunk('g2/a.txt', 5)
    expect(planShards([first, second], 10, 10)).toEqual([[first, second]])
  })

  it('places a single oversized chunk alone rather than dropping it', () => {
    const huge = chunk('g1/a.txt', 50)
    const small = chunk('g2/a.txt', 1)
    expect(planShards([huge, small], 10, 10)).toEqual([[huge], [small]])
  })

  it('groups files that share the first two path segments', () => {
    const a = chunk('src/utils/a.txt', 1)
    const b = chunk('src/utils/b.txt', 1)
    const c = chunk('src/other/c.txt', 1)
    // maxFiles of 2 forces a split unless a and b share a group and are kept
    // together ahead of c, which belongs to a different group.
    expect(planShards([a, b, c], 1000, 2)).toEqual([[a, b], [c]])
  })
})
