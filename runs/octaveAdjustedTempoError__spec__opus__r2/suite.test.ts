import { describe, expect, it } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

describe('octaveAdjustedTempoError', () => {
  describe('exact and octave matches', () => {
    it('returns 0 when candidate equals baseline', () => {
      expect(octaveAdjustedTempoError(120, 120)).toBe(0)
    })

    it('returns 0 when candidate is half the baseline', () => {
      expect(octaveAdjustedTempoError(60, 120)).toBe(0)
    })

    it('returns 0 when candidate is double the baseline', () => {
      expect(octaveAdjustedTempoError(240, 120)).toBe(0)
    })

    it('returns 0 for octave matches with non-integer tempos', () => {
      expect(octaveAdjustedTempoError(87.5, 175)).toBe(0)
      expect(octaveAdjustedTempoError(350, 175)).toBe(0)
    })
  })

  describe('direct comparison', () => {
    it('matches the spec example: 130 against 120 gives 10 / 120', () => {
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('handles a candidate slightly below the baseline', () => {
      // |115 - 120| = 5, |57.5 - 120| = 62.5, |230 - 120| = 110
      expect(octaveAdjustedTempoError(115, 120)).toBeCloseTo(5 / 120, 12)
    })
  })

  describe('halved candidate is closest', () => {
    it('uses half the candidate when the candidate is near double tempo', () => {
      // |250 - 120| = 130, |125 - 120| = 5, |500 - 120| = 380
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120, 12)
    })

    it('uses half the candidate when it is just under double tempo', () => {
      // |230 - 120| = 110, |115 - 120| = 5, |460 - 120| = 340
      expect(octaveAdjustedTempoError(230, 120)).toBeCloseTo(5 / 120, 12)
    })
  })

  describe('doubled candidate is closest', () => {
    it('uses double the candidate when the candidate is near half tempo', () => {
      // |55 - 120| = 65, |27.5 - 120| = 92.5, |110 - 120| = 10
      expect(octaveAdjustedTempoError(55, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('uses double the candidate when it is just over half tempo', () => {
      // |63 - 120| = 57, |31.5 - 120| = 88.5, |126 - 120| = 6
      expect(octaveAdjustedTempoError(63, 120)).toBeCloseTo(6 / 120, 12)
    })
  })

  describe('only a single octave is forgiven', () => {
    it('penalises a candidate at four times the baseline', () => {
      // |480 - 120| = 360, |240 - 120| = 120, |960 - 120| = 840
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1, 12)
    })

    it('penalises a candidate at a quarter of the baseline', () => {
      // |30 - 120| = 90, |15 - 120| = 105, |60 - 120| = 60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5, 12)
    })
  })

  describe('normalisation', () => {
    it('divides by the baseline, not the candidate', () => {
      // Difference is 10 in both cases; only the baseline changes.
      expect(octaveAdjustedTempoError(100, 110)).toBeCloseTo(10 / 110, 12)
      expect(octaveAdjustedTempoError(110, 100)).toBeCloseTo(10 / 100, 12)
    })

    it('is scale invariant', () => {
      expect(octaveAdjustedTempoError(260, 240)).toBeCloseTo(
        octaveAdjustedTempoError(130, 120),
        12,
      )
    })

    it('can exceed 1 for very distant candidates', () => {
      // |1000 - 100| = 900, |500 - 100| = 400, |2000 - 100| = 1900
      expect(octaveAdjustedTempoError(1000, 100)).toBeCloseTo(4, 12)
    })

    it('is never negative for valid inputs', () => {
      for (const candidate of [1, 30, 59, 60, 61, 119, 120, 121, 239, 240, 241, 1000]) {
        expect(octaveAdjustedTempoError(candidate, 120)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('invalid inputs', () => {
    const invalid: Array<[string, number]> = [
      ['zero', 0],
      ['negative zero', -0],
      ['negative', -120],
      ['small negative', -0.001],
      ['NaN', Number.NaN],
    ]

    it.each(invalid)('returns Infinity when candidate is %s', (_label, value) => {
      expect(octaveAdjustedTempoError(value, 120)).toBe(Infinity)
    })

    it.each(invalid)('returns Infinity when baseline is %s', (_label, value) => {
      expect(octaveAdjustedTempoError(120, value)).toBe(Infinity)
    })

    it('returns Infinity when both inputs are invalid', () => {
      expect(octaveAdjustedTempoError(0, 0)).toBe(Infinity)
      expect(octaveAdjustedTempoError(Number.NaN, Number.NaN)).toBe(Infinity)
      expect(octaveAdjustedTempoError(-60, -120)).toBe(Infinity)
    })

    it('returns Infinity for a negative candidate even at an octave of the baseline', () => {
      // Guards against using Math.abs on the inputs.
      expect(octaveAdjustedTempoError(-120, 120)).toBe(Infinity)
      expect(octaveAdjustedTempoError(-240, 120)).toBe(Infinity)
    })

    it('returns positive Infinity, not negative Infinity', () => {
      expect(octaveAdjustedTempoError(-1, 120)).toBe(Number.POSITIVE_INFINITY)
      expect(octaveAdjustedTempoError(120, -1)).toBe(Number.POSITIVE_INFINITY)
    })
  })
})
