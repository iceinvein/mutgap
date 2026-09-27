import { describe, expect, it } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

describe('octaveAdjustedTempoError', () => {
  it('returns 0 when candidate equals baseline', () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0)
  })

  it('returns 0 when candidate is half the baseline (octave error)', () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0)
  })

  it('returns 0 when candidate is double the baseline (octave error)', () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0)
  })

  it('computes the direct error as a fraction of baseline', () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120)
  })

  it('picks the smallest of the three candidate comparisons', () => {
    // direct diff = |100-120|=20, half diff = |50-120|=70, double diff = |200-120|=80
    // smallest is the direct diff
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120)
  })

  it('picks the halved-candidate comparison when it is smallest', () => {
    // candidate 250, baseline 120: direct=130, half=|125-120|=5, double=|500-120|=380
    expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120)
  })

  it('picks the doubled-candidate comparison when it is smallest', () => {
    // candidate 65, baseline 120: direct=55, half=|32.5-120|=87.5, double=|130-120|=10
    expect(octaveAdjustedTempoError(65, 120)).toBeCloseTo(10 / 120)
  })

  it('returns Infinity when candidate is zero', () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Infinity)
  })

  it('returns Infinity when candidate is negative', () => {
    expect(octaveAdjustedTempoError(-120, 120)).toBe(Infinity)
  })

  it('returns Infinity when candidate is NaN', () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Infinity)
  })

  it('returns Infinity when baseline is zero', () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Infinity)
  })

  it('returns Infinity when baseline is negative', () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Infinity)
  })

  it('returns Infinity when baseline is NaN', () => {
    expect(octaveAdjustedTempoError(120, NaN)).toBe(Infinity)
  })

  it('returns Infinity when both inputs are invalid', () => {
    expect(octaveAdjustedTempoError(-1, NaN)).toBe(Infinity)
  })
})
