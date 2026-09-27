import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const f = (path: string, lines = 1): FileChunk => ({ path, text: '', lines })
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  it('returns [] for empty input', () => {
    expect(planShards([], 100, 10)).toEqual([])
  })

  it('puts everything in one shard when it fits', () => {
    const input = [f('a.ts'), f('b.ts'), f('c.ts')]
    expect(paths(planShards(input, 100, 10))).toEqual([['a.ts', 'b.ts', 'c.ts']])
  })

  it('returns the original chunk objects', () => {
    const input = [f('a.ts', 5)]
    expect(planShards(input, 100, 10)[0][0]).toBe(input[0])
  })

  describe('grouping', () => {
    it('groups by directory capped at two segments', () => {
      // Interleaved input; each group gathers in order of first appearance.
      const input = [
        f('root1.ts'),
        f('a/x.ts'),
        f('a/b/x.ts'),
        f('root2.ts'),
        f('a/b/c/y.ts'),
        f('a/y.ts'),
        f('a/b/c/d/z.ts'),
      ]
      expect(paths(planShards(input, 1000, 100))).toEqual([
        ['root1.ts', 'root2.ts', 'a/x.ts', 'a/y.ts', 'a/b/x.ts', 'a/b/c/y.ts', 'a/b/c/d/z.ts'],
      ])
    })

    it('keeps groups together by closing the shard before a group that would not fit', () => {
      // Group a (2 files) fits in the first shard, group b (2 files) would push it to 4 > 3.
      const input = [f('a/1.ts'), f('b/1.ts'), f('a/2.ts'), f('b/2.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['b/1.ts', 'b/2.ts'],
      ])
    })

    it('closes the shard before a group whose total lines would exceed the budget', () => {
      const input = [f('a/1.ts', 4), f('b/1.ts', 3), f('b/2.ts', 3)]
      expect(paths(planShards(input, 9, 100))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('does not close the shard before a group that fits exactly', () => {
      const input = [f('a/1.ts', 4), f('b/1.ts', 3), f('b/2.ts', 3)]
      expect(paths(planShards(input, 10, 100))).toEqual([['a/1.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('splits a group that is too big on its own, file by file', () => {
      const input = [f('a/1.ts'), f('a/2.ts'), f('a/3.ts'), f('a/4.ts'), f('a/5.ts')]
      expect(paths(planShards(input, 1000, 2))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
        ['a/5.ts'],
      ])
    })

    it('does not close an empty shard for an oversized first group', () => {
      const input = [f('a/1.ts', 6), f('a/2.ts', 6)]
      expect(paths(planShards(input, 10, 100))).toEqual([['a/1.ts'], ['a/2.ts']])
    })
  })

  describe('limits', () => {
    it('allows a shard of exactly maxFiles files', () => {
      const input = [f('1.ts'), f('2.ts'), f('3.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([['1.ts', '2.ts', '3.ts']])
    })

    it('splits when a file would exceed maxFiles', () => {
      const input = [f('1.ts'), f('2.ts'), f('3.ts'), f('4.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([['1.ts', '2.ts', '3.ts'], ['4.ts']])
    })

    it('allows a shard of exactly budget lines when adding files one at a time', () => {
      // All in one group, so the group-level check closes nothing; the per-file check decides.
      const input = [f('1.ts', 4), f('2.ts', 3), f('3.ts', 3)]
      expect(paths(planShards(input, 10, 100))).toEqual([['1.ts', '2.ts', '3.ts']])
    })

    it('splits when a file would exceed the budget', () => {
      const input = [f('1.ts', 4), f('2.ts', 3), f('3.ts', 4)]
      expect(paths(planShards(input, 10, 100))).toEqual([['1.ts', '2.ts'], ['3.ts']])
    })

    it('gives a file larger than budget a shard of its own', () => {
      const input = [f('1.ts', 2), f('2.ts', 50), f('3.ts', 2)]
      expect(paths(planShards(input, 10, 100))).toEqual([['1.ts'], ['2.ts'], ['3.ts']])
    })

    it('handles a single file larger than budget', () => {
      expect(paths(planShards([f('big.ts', 500)], 10, 100))).toEqual([['big.ts']])
    })
  })

  it('never drops files or produces empty shards', () => {
    const input: FileChunk[] = []
    for (let i = 0; i < 60; i++) {
      input.push(f(`d${i % 5}/s${i % 3}/deep/f${i}.ts`, (i * 7) % 23))
    }
    const shards = planShards(input, 40, 4)
    expect(shards.every((s) => s.length > 0)).toBe(true)
    expect(shards.flat()).toHaveLength(input.length)
    expect(new Set(shards.flat())).toEqual(new Set(input))
    for (const s of shards) {
      expect(s.length).toBeLessThanOrEqual(4)
      const total = s.reduce((n, c) => n + c.lines, 0)
      if (s.length > 1) expect(total).toBeLessThanOrEqual(40)
    }
  })
})
