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
    const chunk = { path: 'a.ts', text: 'hello', lines: 3 }
    expect(planShards([chunk], 100, 10)[0][0]).toBe(chunk)
  })

  describe('grouping', () => {
    it('caps group keys at two directory segments', () => {
      // a/b/x.ts and a/b/c/y.ts share group a/b; a/z.ts is group a; root.ts is group .
      const input = [f('a/b/x.ts'), f('root.ts'), f('a/z.ts'), f('a/b/c/y.ts'), f('other.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['a/b/x.ts', 'a/b/c/y.ts', 'root.ts', 'other.ts', 'a/z.ts'],
      ])
    })

    it('orders groups by first appearance and keeps input order within a group', () => {
      const input = [f('x/2.ts'), f('y/1.ts'), f('x/1.ts'), f('z/1.ts'), f('y/0.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([
        ['x/2.ts', 'x/1.ts', 'y/1.ts', 'y/0.ts', 'z/1.ts'],
      ])
    })

    it('treats different third segments as the same group', () => {
      const input = [f('a/b/c/1.ts'), f('q/1.ts'), f('a/b/d/2.ts')]
      expect(paths(planShards(input, 100, 10))).toEqual([['a/b/c/1.ts', 'a/b/d/2.ts', 'q/1.ts']])
    })
  })

  describe('group-level split', () => {
    it('starts a fresh shard when the whole group would exceed budget', () => {
      // Current shard has 6 lines; group b totals 6 → 12 > 10, so close before b.
      const input = [f('a/1.ts', 6), f('b/1.ts', 3), f('b/2.ts', 3)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('starts a fresh shard when the whole group would exceed maxFiles', () => {
      const input = [f('a/1.ts'), f('a/2.ts'), f('b/1.ts'), f('b/2.ts')]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'a/2.ts'], ['b/1.ts', 'b/2.ts']])
    })

    it('does not split before a group that brings the shard to exactly budget', () => {
      const input = [f('a/1.ts', 4), f('b/1.ts', 3), f('b/2.ts', 3)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('does not split before a group that brings the shard to exactly maxFiles', () => {
      const input = [f('a/1.ts'), f('b/1.ts'), f('b/2.ts')]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'b/1.ts', 'b/2.ts']])
    })

    it('does not close an empty shard for an oversized first group', () => {
      const input = [f('a/1.ts', 5), f('a/2.ts', 5), f('a/3.ts', 5)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts']])
    })
  })

  describe('file-level split', () => {
    it('splits a group that is larger than budget across shards', () => {
      const input = [f('a/1.ts', 4), f('a/2.ts', 4), f('a/3.ts', 4)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts']])
    })

    it('splits a group that has more files than maxFiles', () => {
      const input = [f('a/1.ts'), f('a/2.ts'), f('a/3.ts'), f('a/4.ts'), f('a/5.ts')]
      expect(paths(planShards(input, 100, 2))).toEqual([
        ['a/1.ts', 'a/2.ts'],
        ['a/3.ts', 'a/4.ts'],
        ['a/5.ts'],
      ])
    })

    it('allows a shard of exactly budget lines when filling file by file', () => {
      const input = [f('a/1.ts', 5), f('a/2.ts', 5), f('a/3.ts', 1)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts', 'a/2.ts'], ['a/3.ts']])
    })

    it('allows a shard of exactly maxFiles files when filling file by file', () => {
      const input = [f('a/1.ts'), f('a/2.ts'), f('a/3.ts'), f('a/4.ts')]
      expect(paths(planShards(input, 100, 3))).toEqual([['a/1.ts', 'a/2.ts', 'a/3.ts'], ['a/4.ts']])
    })

    it('continues filling the shard left open by a previous group', () => {
      // a fits (3 lines); b totals 12 > budget so a's shard is closed, then b is split.
      const input = [f('a/1.ts', 3), f('b/1.ts', 6), f('b/2.ts', 6)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts'], ['b/1.ts'], ['b/2.ts']])
    })
  })

  describe('oversized files', () => {
    it('gives a file larger than budget its own shard', () => {
      const input = [f('a/1.ts', 2), f('a/big.ts', 50), f('a/3.ts', 2)]
      expect(paths(planShards(input, 10, 10))).toEqual([['a/1.ts'], ['a/big.ts'], ['a/3.ts']])
    })

    it('keeps a lone oversized file', () => {
      expect(paths(planShards([f('big.ts', 1000)], 10, 10))).toEqual([['big.ts']])
    })
  })

  describe('invariants', () => {
    it('never drops files, never returns empty shards, and respects limits', () => {
      const dirs = ['.', 'a', 'a/b', 'a/b/c', 'd/e', 'f']
      let seed = 42
      const rand = (n: number) => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31
        return seed % n
      }
      for (let trial = 0; trial < 200; trial++) {
        const budget = 1 + rand(30)
        const maxFiles = 1 + rand(6)
        const input: FileChunk[] = []
        const count = rand(25)
        for (let i = 0; i < count; i++) {
          const dir = dirs[rand(dirs.length)]
          const path = dir === '.' ? `f${i}.ts` : `${dir}/f${i}.ts`
          input.push(f(path, rand(40)))
        }
        const shards = planShards(input, budget, maxFiles)
        const flat = shards.flat()
        expect(flat).toHaveLength(input.length)
        expect(new Set(flat)).toEqual(new Set(input))
        for (const s of shards) {
          expect(s.length).toBeGreaterThan(0)
          expect(s.length).toBeLessThanOrEqual(maxFiles)
          const total = s.reduce((n, c) => n + c.lines, 0)
          if (s.length > 1) expect(total).toBeLessThanOrEqual(budget)
        }
      }
    })
  })
})
