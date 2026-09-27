import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const chunk = (path: string, lines = 1): FileChunk => ({ path, text: `text of ${path}`, lines })

const paths = (shards: FileChunk[][]) => shards.map((shard) => shard.map((c) => c.path))

const BIG = 1_000_000

describe('planShards', () => {
  describe('basics', () => {
    it('returns [] for empty input', () => {
      expect(planShards([], 10, 10)).toEqual([])
    })

    it('puts a single file in a single shard', () => {
      expect(paths(planShards([chunk('a.ts', 3)], 10, 10))).toEqual([['a.ts']])
    })

    it('puts everything in one shard when it all fits', () => {
      const input = [chunk('a/x.ts', 2), chunk('a/y.ts', 2), chunk('b/z.ts', 2)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/x.ts', 'a/y.ts', 'b/z.ts']])
    })

    it('returns the original chunk objects unchanged', () => {
      const input = [chunk('a/x.ts', 2), chunk('b/y.ts', 3)]
      const result = planShards(input, 10, 10)
      expect(result.flat()[0]).toBe(input[0])
      expect(result.flat()[1]).toBe(input[1])
      expect(result.flat()[1]).toEqual({ path: 'b/y.ts', text: 'text of b/y.ts', lines: 3 })
    })

    it('does not mutate the input array', () => {
      const input = [chunk('a/x.ts'), chunk('b/y.ts'), chunk('a/z.ts')]
      const copy = [...input]
      planShards(input, 10, 10)
      expect(input).toEqual(copy)
    })
  })

  describe('grouping', () => {
    it('brings files of the same group together, ordered by first appearance', () => {
      const input = [chunk('a/1.ts'), chunk('b/1.ts'), chunk('a/2.ts'), chunk('c/1.ts'), chunk('b/2.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/1.ts', 'a/2.ts', 'b/1.ts', 'b/2.ts', 'c/1.ts']])
    })

    it('keeps input order of files within a group', () => {
      const input = [chunk('a/z.ts'), chunk('b/1.ts'), chunk('a/m.ts'), chunk('a/a.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/z.ts', 'a/m.ts', 'a/a.ts', 'b/1.ts']])
    })

    it('groups files with no slash under "."', () => {
      const input = [chunk('README.md'), chunk('a/x.ts'), chunk('package.json')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['README.md', 'package.json', 'a/x.ts']])
    })

    it('caps the group at two directory segments', () => {
      const input = [chunk('a/b/x.ts'), chunk('z/1.ts'), chunk('a/b/c/y.ts'), chunk('a/b/c/d/e.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/b/x.ts', 'a/b/c/y.ts', 'a/b/c/d/e.ts', 'z/1.ts']])
    })

    it('treats a/x.ts (group a) and a/b/x.ts (group a/b) as different groups', () => {
      const input = [chunk('a/b/1.ts'), chunk('a/2.ts'), chunk('a/b/3.ts'), chunk('a/4.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/b/1.ts', 'a/b/3.ts', 'a/2.ts', 'a/4.ts']])
    })

    it('uses the directory, not a file-name prefix', () => {
      // "ab/x.ts" is group "ab", not "a"
      const input = [chunk('a/1.ts'), chunk('ab/1.ts'), chunk('a/2.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/1.ts', 'a/2.ts', 'ab/1.ts']])
    })

    it('distinguishes groups that share a first segment but differ in the second', () => {
      const input = [chunk('a/b/1.ts'), chunk('a/c/1.ts'), chunk('a/b/2.ts')]
      expect(paths(planShards(input, BIG, BIG))).toEqual([['a/b/1.ts', 'a/b/2.ts', 'a/c/1.ts']])
    })
  })

  describe('line budget', () => {
    it('allows a shard of exactly budget lines', () => {
      const input = [chunk('a/1.ts', 4), chunk('a/2.ts', 6)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts', 'a/2.ts']])
    })

    it('splits a group when the next file would go one line over budget', () => {
      const input = [chunk('a/1.ts', 4), chunk('a/2.ts', 7)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts'], ['a/2.ts']])
    })

    it('adds a following group to the current shard if the whole group fits exactly', () => {
      const input = [chunk('a/1.ts', 4), chunk('b/1.ts', 3), chunk('b/2.ts', 3)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('starts a fresh shard for a group that would not fit as a whole, even if its first file would', () => {
      // b/1.ts alone would fit next to a/1.ts (5 + 3 = 8), but the whole group (6) would not (11)
      const input = [chunk('a/1.ts', 5), chunk('b/1.ts', 3), chunk('b/2.ts', 3)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('splits a group larger than the budget file by file', () => {
      const input = [chunk('a/1.ts', 4), chunk('a/2.ts', 4), chunk('a/3.ts', 4), chunk('a/4.ts', 4)]
      expect(paths(planShards(input, 10, BIG))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
      ])
    })

    it('lets the next group continue in the last partial shard of a split group', () => {
      const input = [chunk('a/1.ts', 6), chunk('a/2.ts', 6), chunk('b/1.ts', 4)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts'], ['a/2.ts', 'b/1.ts']])
    })

    it('closes the current shard before a big group even when the group alone exceeds budget', () => {
      const input = [chunk('a/1.ts', 2), chunk('b/1.ts', 6), chunk('b/2.ts', 6)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts'], ['b/1.ts'], ['b/2.ts']])
    })

    it('gives a file larger than the budget a shard of its own', () => {
      const input = [chunk('a/1.ts', 3), chunk('a/huge.ts', 50), chunk('a/2.ts', 3)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts'], ['a/huge.ts'], ['a/2.ts']])
    })

    it('does not produce an empty shard when the first file is larger than the budget', () => {
      const input = [chunk('huge.ts', 50), chunk('small.ts', 1)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['huge.ts'], ['small.ts']])
    })

    it('handles an oversized single-file group at the start without an empty shard', () => {
      const input = [chunk('a/huge.ts', 50), chunk('b/1.ts', 1)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/huge.ts'], ['b/1.ts']])
    })

    it('counts zero-line files without closing the shard', () => {
      const input = [chunk('a/1.ts', 10), chunk('a/2.ts', 0), chunk('b/1.ts', 0)]
      expect(paths(planShards(input, 10, BIG))).toEqual([['a/1.ts', 'a/2.ts', 'b/1.ts']])
    })
  })

  describe('file limit', () => {
    it('allows a shard of exactly maxFiles files', () => {
      const input = [chunk('a/1.ts'), chunk('a/2.ts'), chunk('a/3.ts')]
      expect(paths(planShards(input, BIG, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts']])
    })

    it('splits a group when it would exceed maxFiles', () => {
      const input = [chunk('a/1.ts'), chunk('a/2.ts'), chunk('a/3.ts'), chunk('a/4.ts'), chunk('a/5.ts')]
      expect(paths(planShards(input, BIG, 2))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts', 'a/4.ts'], ['a/5.ts']])
    })

    it('adds a following group to the current shard if the file count fits exactly', () => {
      const input = [chunk('a/1.ts'), chunk('b/1.ts'), chunk('b/2.ts')]
      expect(paths(planShards(input, BIG, 3))).toEqual([['a/1.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('starts a fresh shard for a group whose file count would not fit as a whole', () => {
      const input = [chunk('a/1.ts'), chunk('a/2.ts'), chunk('b/1.ts'), chunk('b/2.ts')]
      expect(paths(planShards(input, BIG, 3))).toEqual([['a/1.ts', 'a/2.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('with maxFiles 1, gives every file its own shard in grouped order', () => {
      const input = [chunk('a/1.ts'), chunk('b/1.ts'), chunk('a/2.ts')]
      expect(paths(planShards(input, BIG, 1))).toEqual([['a/1.ts'], ['a/2.ts'], ['b/1.ts']])
    })
  })

  describe('both limits', () => {
    it('closes on whichever limit is hit first', () => {
      const input = [
        chunk('a/1.ts', 1),
        chunk('a/2.ts', 1),
        chunk('a/3.ts', 1), // file limit (2) hit before line limit
        chunk('b/1.ts', 9), // fits next to a/3.ts at exactly 10 lines, 2 files
        chunk('c/1.ts', 1), // line limit hit
      ]
      expect(paths(planShards(input, 10, 2))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts', 'b/1.ts'], ['c/1.ts']])
    })

    it('closes before a group when only the group-level file count would overflow', () => {
      const input = [chunk('a/1.ts', 1), chunk('b/1.ts', 1), chunk('b/2.ts', 1)]
      expect(paths(planShards(input, BIG, 2))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })
  })

  describe('invariants', () => {
    // Deterministic pseudo-random generator so failures are reproducible
    const rng = (seed: number) => () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    const dirs = ['', 'a/', 'b/', 'a/b/', 'a/b/c/', 'a/c/', 'x/y/z/w/']

    for (let seed = 1; seed <= 50; seed++) {
      it(`holds for random input (seed ${seed})`, () => {
        const rand = rng(seed)
        const n = Math.floor(rand() * 30)
        const input = Array.from({ length: n }, (_, i) =>
          chunk(`${dirs[Math.floor(rand() * dirs.length)]}f${i}.ts`, Math.floor(rand() * 40)),
        )
        const budget = 1 + Math.floor(rand() * 60)
        const maxFiles = 1 + Math.floor(rand() * 6)

        const shards = planShards(input, budget, maxFiles)

        // every file appears exactly once
        expect(shards.flat().map((c) => c.path).sort()).toEqual(input.map((c) => c.path).sort())

        for (const shard of shards) {
          expect(shard.length).toBeGreaterThan(0)
          expect(shard.length).toBeLessThanOrEqual(maxFiles)
          const total = shard.reduce((sum, c) => sum + c.lines, 0)
          if (shard.length > 1) expect(total).toBeLessThanOrEqual(budget)
        }

        if (n === 0) expect(shards).toEqual([])
      })
    }
  })
})
