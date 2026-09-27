import { expect, test } from 'vitest'
import { estimateCostUsd } from './estimateCostUsd'

const price = {
  inputCostPerToken: 1e-6,
  outputCostPerToken: 2e-6,
  cacheWriteCostPerToken: 3e-6,
  cacheReadCostPerToken: 4e-6,
  webSearchCostPerRequest: 0.5,
  fastMultiplier: 2,
}
const usage = (speed: 'standard' | 'fast') => ({
  inputTokens: 1000,
  outputTokens: 1000,
  cacheWriteTokens: 1000,
  cacheReadTokens: 1000,
  webSearchRequests: 2,
  speed,
})

test('standard speed sums every count times its price without the fast multiplier', () => {
  expect(estimateCostUsd('m', usage('standard'), new Map([['m', price]]))).toBeCloseTo(1.01, 10)
})

test('fast speed applies the fast multiplier', () => {
  expect(estimateCostUsd('m', usage('fast'), new Map([['m', price]]))).toBeCloseTo(2.02, 10)
})

test('a dated model name falls back to the built-in price of its canonical name', () => {
  const u = { inputTokens: 1_000_000, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, webSearchRequests: 0, speed: 'standard' as const }
  expect(estimateCostUsd('claude-3-5-haiku-20241022', u, new Map())).toBeCloseTo(0.8, 10)
})

test('a table entry for the canonical name beats the built-in price', () => {
  const u = { inputTokens: 1_000_000, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, webSearchRequests: 0, speed: 'standard' as const }
  expect(estimateCostUsd('gpt-4o@2024-08-06', u, new Map([['gpt-4o', price]]))).toBeCloseTo(1, 10)
})

test('an unknown model costs nothing', () => {
  expect(estimateCostUsd('mystery-model', usage('fast'), new Map([['m', price]]))).toBe(0)
})
