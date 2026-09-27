import { describe, expect, it } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

describe('octaveAdjustedTempoError', () => {
  it('returns the plain fractional error when no octave adjustment helps', () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120)
  })

  it('returns 0 when candidate equals baseline', () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0)
  })

  it('forgives a half-tempo octave error', () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0)
  })

  it('forgives a double-tempo octave error', () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0)
  })

  it('picks the smallest of the three candidate comparisons', () => {
    // |140-120|=20, |70-120|=50, |280-120|=160 -> min is 20
    expect(octaveAdjustedTempoError(140, 120)).toBeCloseTo(20 / 120)
  })

  it('divides the error by the baseline, not the candidate', () => {
    expect(octaveAdjustedTempoError(110, 100)).toBeCloseTo(10 / 100)
  })

  it('returns Infinity when candidate is zero', () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Infinity)
  })

  it('returns Infinity when candidate is negative', () => {
    expect(octaveAdjustedTempoError(-130, 120)).toBe(Infinity)
  })

  it('returns Infinity when candidate is NaN', () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Infinity)
  })

  it('returns Infinity when baseline is zero', () => {
    expect(octaveAdjustedTempoError(130, 0)).toBe(Infinity)
  })

  it('returns Infinity when baseline is negative', () => {
    expect(octaveAdjustedTempoError(130, -120)).toBe(Infinity)
  })

  it('returns Infinity when baseline is NaN', () => {
    expect(octaveAdjustedTempoError(130, NaN)).toBe(Infinity)
  })

  it('returns Infinity when both inputs are invalid', () => {
    expect(octaveAdjustedTempoError(0, 0)).toBe(Infinity)
    expect(octaveAdjustedTempoError(NaN, NaN)).toBe(Infinity)
  })
})
