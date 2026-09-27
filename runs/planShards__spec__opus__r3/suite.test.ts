import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const c = (path: string, lines: number): FileChunk => ({ path, text: `diff of ${path}`, lines })

// Render shards as arrays of paths for readable assertions.
const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((f) => f.path))

describe('planShards', () => {
  describe('basics', () => {
    it('returns [] for empty input', () => {
      expect(planShards([], 100, 10)).toEqual([])
    })

    it('puts a single file in a single shard', () => {
      const f = c('a.ts', 5)
      expect(planShards([f], 100, 10)).toEqual([[f]])
    })

    it('keeps everything in one shard when it all fits', () => {
      const input = [c('a/x.ts', 1), c('a/y.ts', 2), c('b/z.ts', 3)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'a/y.ts', 'b/z.ts']])
    })

    it('returns the original chunk objects unchanged', () => {
      const input = [c('a/x.ts', 1), c('b/y.ts', 2)]
      const snapshot = structuredClone(input)
      const out = planShards(input, 100, 10).flat()
      expect(out[0]).toBe(input[0])
      expect(out[1]).toBe(input[1])
      expect(input).toEqual(snapshot)
    })
  })

  describe('grouping', () => {
    it('brings files of the same group together in first-appearance order', () => {
      const input = [c('a/1.ts', 1), c('b/1.ts', 1), c('a/2.ts', 1), c('c/1.ts', 1), c('b/2.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/1.ts', 'a/2.ts', 'b/1.ts', 'b/2.ts', 'c/1.ts']])
    })

    it('treats root-level files as group "."', () => {
      const input = [c('README.md', 1), c('a/x.ts', 1), c('package.json', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['README.md', 'package.json', 'a/x.ts']])
    })

    it('caps the group at two directory segments', () => {
      const input = [c('a/b/x.ts', 1), c('z/y.ts', 1), c('a/b/c/d/deep.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/b/x.ts', 'a/b/c/d/deep.ts', 'z/y.ts']])
    })

    it('does not merge a/ with a/b/', () => {
      const input = [c('a/x.ts', 1), c('a/b/y.ts', 1), c('a/z.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'a/z.ts', 'a/b/y.ts']])
    })

    it('does not treat a file named like a directory as that group', () => {
      // `a` (root file) is group ".", `a/x.ts` is group "a"
      const input = [c('a', 1), c('a/x.ts', 1), c('b.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a', 'b.ts', 'a/x.ts']])
    })
  })

  describe('line budget', () => {
    it('allows a shard of exactly budget lines', () => {
      const input = [c('a/x.ts', 4), c('a/y.ts', 6)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'a/y.ts']])
    })

    it('closes the shard when the next file would exceed budget', () => {
      const input = [c('a/x.ts', 4), c('a/y.ts', 7)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts'], ['a/y.ts']])
    })

    it('starts a whole group in a fresh shard if it would not fit in the current one', () => {
      // After a/x (5), group b totals 6 -> 11 > 10, so b starts a new shard,
      // even though b/1 alone (3) would have fit.
      const input = [c('a/x.ts', 5), c('b/1.ts', 3), c('b/2.ts', 3)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('adds a whole group to the current shard if it fits exactly', () => {
      const input = [c('a/x.ts', 4), c('b/1.ts', 3), c('b/2.ts', 3)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('splits a group larger than budget across shards file by file', () => {
      const input = [c('a/1.ts', 4), c('a/2.ts', 4), c('a/3.ts', 4), c('a/4.ts', 4)]
      expect(paths(planShards(input, 10, 10))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
      ])
    })

    it('closes the current shard before an oversized group, then splits it', () => {
      const input = [c('a/x.ts', 2), c('b/1.ts', 6), c('b/2.ts', 6)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts'], ['b/1.ts'], ['b/2.ts']])
    })

    it('lets the next group join the tail shard of a split group if it fits', () => {
      // group a splits into [6] [6]; group b (3) fits alongside the second.
      const input = [c('a/1.ts', 6), c('a/2.ts', 6), c('b/1.ts', 3)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts'], ['a/2.ts', 'b/1.ts']])
    })

    it('gives a file larger than budget its own shard and never drops it', () => {
      const input = [c('a/small.ts', 2), c('a/huge.ts', 50), c('a/tail.ts', 2)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/small.ts'], ['a/huge.ts'], ['a/tail.ts']])
    })

    it('puts an oversized first file in its own shard', () => {
      const input = [c('a/huge.ts', 50), c('b/x.ts', 1)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/huge.ts'], ['b/x.ts']])
    })

    it('handles zero-line files', () => {
      const input = [c('a/x.ts', 10), c('a/empty.ts', 0)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'a/empty.ts']])
    })
  })

  describe('file limit', () => {
    it('allows a shard of exactly maxFiles files', () => {
      const input = [c('a/1.ts', 1), c('a/2.ts', 1), c('a/3.ts', 1)]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts']])
    })

    it('closes the shard when it would exceed maxFiles', () => {
      const input = [c('a/1.ts', 1), c('a/2.ts', 1), c('a/3.ts', 1), c('a/4.ts', 1)]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts'], ['a/4.ts']])
    })

    it('starts a group in a fresh shard if its file count would exceed maxFiles', () => {
      const input = [c('a/1.ts', 1), c('a/2.ts', 1), c('b/1.ts', 1), c('b/2.ts', 1)]
      expect(paths(planShards(input, 100, 3))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['b/1.ts', 'b/2.ts'],
      ])
    })

    it('works with maxFiles = 1', () => {
      const input = [c('a/1.ts', 1), c('b/1.ts', 1), c('a/2.ts', 1)]
      expect(paths(planShards(input, 100, 1))).toEqual([['a/1.ts'], ['a/2.ts'], ['b/1.ts']])
    })

    it('applies both limits together', () => {
      // group a: 3 files fit by lines (6) but maxFiles=2 splits them;
      // group b (5 lines) cannot join [a/3] (2+5 > 6) -> new shard.
      const input = [c('a/1.ts', 2), c('a/2.ts', 2), c('a/3.ts', 2), c('b/1.ts', 5)]
      expect(paths(planShards(input, 6, 2))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts'], ['b/1.ts']])
    })
  })

  describe('invariants', () => {
    // Deterministic pseudo-random generator so failures are reproducible.
    const rng = (seed: number) => () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }

    const groupOf = (p: string) => {
      const dirs = p.split('/').slice(0, -1)
      return dirs.length === 0 ? '.' : dirs.slice(0, 2).join('/')
    }

    const expectedOrder = (input: FileChunk[]) => {
      const groups = new Map<string, FileChunk[]>()
      for (const f of input) {
        const g = groupOf(f.path)
        if (!groups.has(g)) groups.set(g, [])
        groups.get(g)!.push(f)
      }
      return [...groups.values()].flat()
    }

    it('holds for random inputs', () => {
      const dirs = ['', 'a/', 'b/', 'a/b/', 'a/b/c/', 'a/c/', 'x/y/z/']
      for (let seed = 1; seed <= 200; seed++) {
        const r = rng(seed)
        const n = Math.floor(r() * 25)
        const input = Array.from({ length: n }, (_, i) =>
          c(`${dirs[Math.floor(r() * dirs.length)]}f${i}.ts`, Math.floor(r() * 40)),
        )
        const budget = 1 + Math.floor(r() * 60)
        const maxFiles = 1 + Math.floor(r() * 6)
        const shards = planShards(input, budget, maxFiles)

        // Every file appears exactly once, in grouped order.
        expect(shards.flat()).toEqual(expectedOrder(input))
        for (const s of shards) {
          expect(s.length).toBeGreaterThan(0)
          expect(s.length).toBeLessThanOrEqual(maxFiles)
          const total = s.reduce((sum, f) => sum + f.lines, 0)
          if (s.length > 1) expect(total).toBeLessThanOrEqual(budget)
        }
        // Greedy: a shard is only closed when the next file would not fit.
        for (let i = 0; i + 1 < shards.length; i++) {
          const s = shards[i]
          const next = shards[i + 1][0]
          const total = s.reduce((sum, f) => sum + f.lines, 0)
          expect(total + next.lines > budget || s.length + 1 > maxFiles || groupOf(next.path) !== groupOf(s[s.length - 1].path)).toBe(true)
        }
      }
    })
  })
})
