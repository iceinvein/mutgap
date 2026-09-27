import { describe, expect, it } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

describe('octaveAdjustedTempoError', () => {
  it('is zero when the candidate exactly matches the baseline', () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0)
  })

  it('is zero when the candidate is half the baseline (octave error)', () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0)
  })

  it('is zero when the candidate is double the baseline (octave error)', () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0)
  })

  it('uses the direct difference when it is the smallest', () => {
    // |130-120| = 10, |65-120| = 55, |260-120| = 140 -> smallest is 10
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120)
  })

  it('uses the halved-candidate difference when it is the smallest', () => {
    // candidate 200, baseline 120: direct 80, half |100-120|=20, double |400-120|=280
    expect(octaveAdjustedTempoError(200, 120)).toBeCloseTo(20 / 120)
  })

  it('uses the doubled-candidate difference when it is the smallest', () => {
    // candidate 65, baseline 120: direct 55, half |32.5-120|=87.5, double |130-120|=10
    expect(octaveAdjustedTempoError(65, 120)).toBeCloseTo(10 / 120)
  })

  it('is Infinity when the candidate is zero', () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Infinity)
  })

  it('is Infinity when the baseline is zero', () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Infinity)
  })

  it('is Infinity when the candidate is negative', () => {
    expect(octaveAdjustedTempoError(-120, 120)).toBe(Infinity)
  })

  it('is Infinity when the baseline is negative', () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Infinity)
  })

  it('is Infinity when the candidate is NaN', () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Infinity)
  })

  it('is Infinity when the baseline is NaN', () => {
    expect(octaveAdjustedTempoError(120, NaN)).toBe(Infinity)
  })

  it('is Infinity when both inputs are invalid', () => {
    expect(octaveAdjustedTempoError(0, NaN)).toBe(Infinity)
    expect(octaveAdjustedTempoError(-5, -5)).toBe(Infinity)
  })
})
