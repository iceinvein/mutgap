import { expect, test } from 'vitest'
import { computeEffortScore } from './computeEffortScore'

const file = (additions: number, deletions = 0) => ({ path: 'f.ts', additions, deletions })
const many = (n: number, additions = 1) => Array.from({ length: n }, () => file(additions))

test('two files totalling exactly 50 lines score 1', () => {
  expect(computeEffortScore([file(20, 5), file(15, 10)])).toBe(1)
})

test('51 lines in one file score 2', () => {
  expect(computeEffortScore([file(51)])).toBe(2)
})

test('the line total alone can push a single file to a higher tier', () => {
  expect(computeEffortScore([file(300)])).toBe(3)
  expect(computeEffortScore([file(1000)])).toBe(4)
  expect(computeEffortScore([file(1001)])).toBe(5)
})

test('the file count alone can push small changes to a higher tier', () => {
  expect(computeEffortScore(many(3))).toBe(2)
  expect(computeEffortScore(many(6))).toBe(3)
  expect(computeEffortScore(many(21))).toBe(5)
})

test('an empty change scores 1', () => {
  expect(computeEffortScore([])).toBe(1)
})
