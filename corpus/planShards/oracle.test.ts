import { expect, test } from 'vitest'
import { planShards } from './planShards'

const f = (path: string, lines: number) => ({ path, text: '', lines })
const paths = (shards: { path: string }[][]) => shards.map((s) => s.map((c) => c.path))

test('a group landing exactly on budget stays in one shard', () => {
  expect(paths(planShards([f('a/x.ts', 60), f('a/y.ts', 40)], 100, 10))).toEqual([['a/x.ts', 'a/y.ts']])
})

test('a file pushing a shard over budget starts a new shard', () => {
  expect(paths(planShards([f('a/x.ts', 60), f('a/y.ts', 41)], 100, 10))).toEqual([['a/x.ts'], ['a/y.ts']])
})

test('files of one group are brought together in first-appearance order', () => {
  expect(paths(planShards([f('a/1.ts', 1), f('b/1.ts', 1), f('a/2.ts', 1)], 100, 10))).toEqual([
    ['a/1.ts', 'a/2.ts', 'b/1.ts'],
  ])
})

test('an oversized file gets its own shard', () => {
  expect(paths(planShards([f('a/x.ts', 10), f('b/big.ts', 500)], 100, 10))).toEqual([['a/x.ts'], ['b/big.ts']])
})

test('empty input returns no shards', () => {
  expect(planShards([], 100, 10)).toEqual([])
})
