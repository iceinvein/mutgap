import { expect, test } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

test('a zero candidate tempo is infinitely wrong', () => {
  expect(octaveAdjustedTempoError(0, 120)).toBe(Infinity)
})

test('a non-positive or NaN baseline, or a negative candidate, is infinitely wrong', () => {
  expect(octaveAdjustedTempoError(120, 0)).toBe(Infinity)
  expect(octaveAdjustedTempoError(-120, 120)).toBe(Infinity)
  expect(octaveAdjustedTempoError(120, Number.NaN)).toBe(Infinity)
})

test('half-time and double-time detections count as exact', () => {
  expect(octaveAdjustedTempoError(60, 120)).toBe(0)
  expect(octaveAdjustedTempoError(240, 120)).toBe(0)
  expect(octaveAdjustedTempoError(120, 120)).toBe(0)
})

test('the error is the closest difference relative to the baseline', () => {
  expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120)
})
