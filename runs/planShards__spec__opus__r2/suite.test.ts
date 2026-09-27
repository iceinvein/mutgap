import { describe, expect, it } from 'vitest'
import { planShards, type FileChunk } from './planShards'

const f = (path: string, lines = 1): FileChunk => ({ path, text: `// ${path}`, lines })

const paths = (shards: FileChunk[][]) => shards.map((s) => s.map((c) => c.path))

describe('planShards', () => {
  describe('basics', () => {
    it('returns [] for empty input', () => {
      expect(planShards([], 100, 10)).toEqual([])
    })

    it('puts a single small file in one shard', () => {
      expect(paths(planShards([f('a.ts', 5)], 100, 10))).toEqual([['a.ts']])
    })

    it('returns the original chunk objects unchanged', () => {
      const chunk = f('src/a.ts', 3)
      const [[out]] = planShards([chunk], 100, 10)
      expect(out).toBe(chunk)
    })

    it('packs everything into one shard when it fits', () => {
      const input = [f('a/x.ts', 10), f('b/y.ts', 10), f('c.ts', 10)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'b/y.ts', 'c.ts']])
    })
  })

  describe('grouping', () => {
    it('treats files with no slash as group "."', () => {
      const input = [f('a.ts'), f('dir/x.ts'), f('b.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([['a.ts', 'b.ts', 'dir/x.ts']])
    })

    it('uses the one-segment directory as the group', () => {
      const input = [f('a/x.ts'), f('b/y.ts'), f('a/z.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'a/z.ts', 'b/y.ts']])
    })

    it('caps groups at two directory segments', () => {
      const input = [f('a/b/x.ts'), f('a/other.ts'), f('a/b/c/d/y.ts'), f('a/b/c/z.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['a/b/x.ts', 'a/b/c/d/y.ts', 'a/b/c/z.ts', 'a/other.ts'],
      ])
    })

    it('does not merge a/ with a/b/', () => {
      // a/x.ts is group "a"; a/b/y.ts is group "a/b"; they are distinct groups
      const input = [f('a/x.ts', 1), f('a/b/y.ts', 1), f('a/z.ts', 1)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'a/z.ts', 'a/b/y.ts']])
    })

    it('orders groups by first appearance and keeps input order within a group', () => {
      const input = [f('b/1.ts'), f('a/1.ts'), f('b/2.ts'), f('root.ts'), f('a/2.ts'), f('b/3.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['b/1.ts', 'b/2.ts', 'b/3.ts', 'a/1.ts', 'a/2.ts', 'root.ts'],
      ])
    })

    it('groups by directory, not by filename prefix', () => {
      const input = [f('ab/x.ts'), f('a/y.ts'), f('ab/z.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([['ab/x.ts', 'ab/z.ts', 'a/y.ts']])
    })
  })

  describe('line budget', () => {
    it('allows a shard of exactly budget lines', () => {
      const input = [f('a.ts', 40), f('b.ts', 60)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a.ts', 'b.ts']])
    })

    it('splits within a group when one more line would exceed the budget', () => {
      const input = [f('a.ts', 40), f('b.ts', 61)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a.ts'], ['b.ts']])
    })

    it('starts a fresh shard for a group that would not fit whole', () => {
      // Shard has 60 lines; group "g" totals 60, would make 120 > 100.
      // Even though g/1.ts alone would fit, the whole group moves to a new shard.
      const input = [f('a/x.ts', 60), f('g/1.ts', 30), f('g/2.ts', 30)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts'], ['g/1.ts', 'g/2.ts']])
    })

    it('keeps adding a group to the current shard when it fits exactly', () => {
      const input = [f('a/x.ts', 40), f('g/1.ts', 30), f('g/2.ts', 30)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/x.ts', 'g/1.ts', 'g/2.ts']])
    })

    it('splits a group larger than the budget file by file', () => {
      const input = [f('g/1.ts', 50), f('g/2.ts', 50), f('g/3.ts', 50), f('g/4.ts', 10)]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['g/1.ts', 'g/2.ts'],
        ['g/3.ts', 'g/4.ts'],
      ])
    })

    it('continues filling the last shard of a split group with the next group', () => {
      const input = [f('g/1.ts', 80), f('g/2.ts', 50), f('h/1.ts', 20), f('h/2.ts', 30)]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['g/1.ts'],
        ['g/2.ts', 'h/1.ts', 'h/2.ts'],
      ])
    })

    it('gives an oversized file a shard of its own and never drops it', () => {
      const input = [f('a.ts', 10), f('big/huge.ts', 500), f('c/small.ts', 10)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a.ts'], ['big/huge.ts'], ['c/small.ts']])
    })

    it('puts an oversized first file alone without creating an empty shard', () => {
      const shards = planShards([f('huge.ts', 500), f('b.ts', 1)], 100, 10)
      expect(paths(shards)).toEqual([['huge.ts'], ['b.ts']])
    })

    it('handles several oversized files in the same group', () => {
      const input = [f('g/1.ts', 200), f('g/2.ts', 300)]
      expect(paths(planShards(input, 100, 10))).toEqual([['g/1.ts'], ['g/2.ts']])
    })

    it('counts zero-line files as fitting in a full shard', () => {
      const input = [f('a.ts', 100), f('b.ts', 0)]
      expect(paths(planShards(input, 100, 10))).toEqual([['a.ts', 'b.ts']])
    })
  })

  describe('file limit', () => {
    it('allows a shard of exactly maxFiles files', () => {
      const input = [f('a.ts'), f('b.ts'), f('c.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([['a.ts', 'b.ts', 'c.ts']])
    })

    it('splits when one more file would exceed maxFiles', () => {
      const input = [f('a.ts'), f('b.ts'), f('c.ts'), f('d.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([['a.ts', 'b.ts', 'c.ts'], ['d.ts']])
    })

    it('starts a fresh shard when the whole group would exceed maxFiles', () => {
      const input = [f('a/x.ts'), f('a/y.ts'), f('g/1.ts'), f('g/2.ts')]
      expect(paths(planShards(input, 1000, 3))).toEqual([['a/x.ts', 'a/y.ts'], ['g/1.ts', 'g/2.ts']])
    })

    it('splits a group with more than maxFiles files', () => {
      const input = [f('g/1.ts'), f('g/2.ts'), f('g/3.ts'), f('g/4.ts'), f('g/5.ts')]
      expect(paths(planShards(input, 1000, 2))).toEqual([
        ['g/1.ts', 'g/2.ts'],
        ['g/3.ts', 'g/4.ts'],
        ['g/5.ts'],
      ])
    })

    it('puts every file in its own shard when maxFiles is 1', () => {
      const input = [f('a/x.ts'), f('b/y.ts'), f('a/z.ts')]
      expect(paths(planShards(input, 1000, 1))).toEqual([['a/x.ts'], ['a/z.ts'], ['b/y.ts']])
    })
  })

  describe('combined limits', () => {
    it('closes a shard when either limit would be exceeded', () => {
      // lines fit (30 <= 100) but files would be 3 > 2
      const byFiles = [f('a.ts', 10), f('b.ts', 10), f('c.ts', 10)]
      expect(paths(planShards(byFiles, 100, 2))).toEqual([['a.ts', 'b.ts'], ['c.ts']])
      // files fit (2 <= 5) but lines would be 110 > 100
      const byLines = [f('a.ts', 60), f('b.ts', 50)]
      expect(paths(planShards(byLines, 100, 5))).toEqual([['a.ts'], ['b.ts']])
    })

    it('handles a realistic mixed diff', () => {
      const input = [
        f('README.md', 5),
        f('src/core/a.ts', 40),
        f('test/a.test.ts', 30),
        f('src/core/deep/b.ts', 40),
        f('package.json', 2),
        f('src/util.ts', 50),
        f('test/b.test.ts', 30),
      ]
      // groups in order: "." [README, package.json]=7, "src/core" [a, deep/b]=80,
      // "test" [a.test, b.test]=60, "src" [util]=50.
      // "src/core" would make 4 files > 3, so it starts a fresh shard.
      expect(paths(planShards(input, 100, 3))).toEqual([
        ['README.md', 'package.json'],
        ['src/core/a.ts', 'src/core/deep/b.ts'],
        ['test/a.test.ts', 'test/b.test.ts'],
        ['src/util.ts'],
      ])
    })
  })

  describe('invariants', () => {
    const input = Array.from({ length: 40 }, (_, i) =>
      f(`${['a', 'b/c', 'b/c/d', 'e', ''][i % 5]}${i % 5 === 4 ? '' : '/'}f${i}.ts`, (i * 37) % 90),
    )

    for (const [budget, maxFiles] of [
      [50, 3],
      [100, 5],
      [30, 1],
      [1000, 100],
    ]) {
      it(`holds for budget=${budget}, maxFiles=${maxFiles}`, () => {
        const shards = planShards(input, budget, maxFiles)
        // no empty shards
        for (const s of shards) expect(s.length).toBeGreaterThan(0)
        // every file present exactly once
        const flat = shards.flat()
        expect(flat).toHaveLength(input.length)
        expect(new Set(flat)).toEqual(new Set(input))
        // limits respected, except a lone oversized file
        for (const s of shards) {
          expect(s.length).toBeLessThanOrEqual(maxFiles)
          const total = s.reduce((n, c) => n + c.lines, 0)
          if (s.length > 1) expect(total).toBeLessThanOrEqual(budget)
        }
      })
    }
  })
})
