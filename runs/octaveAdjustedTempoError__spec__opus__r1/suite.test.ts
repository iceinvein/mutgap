import { describe, expect, it } from 'vitest'
import { octaveAdjustedTempoError } from './octaveAdjustedTempoError'

describe('octaveAdjustedTempoError', () => {
  describe('examples from the spec', () => {
    it('gives 10 / 120 for a candidate of 130 against a baseline of 120', () => {
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120, 12)
    })

    it.each([60, 120, 240])(
      'gives 0 for a candidate of %d against a baseline of 120',
      (candidate) => {
        expect(octaveAdjustedTempoError(candidate, 120)).toBe(0)
      },
    )
  })

  describe('picks the smallest of the three differences', () => {
    it('uses the direct difference when it is smallest', () => {
      // |100-120|=20, |50-120|=70, |200-120|=80
      expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120, 12)
    })

    it('uses half the candidate when that is smallest', () => {
      // |250-120|=130, |125-120|=5, |500-120|=380
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120, 12)
    })

    it('uses double the candidate when that is smallest', () => {
      // |55-120|=65, |27.5-120|=92.5, |110-120|=10
      expect(octaveAdjustedTempoError(55, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('handles a halved candidate that lands below the baseline', () => {
      // |230-120|=110, |115-120|=5, |460-120|=340
      expect(octaveAdjustedTempoError(230, 120)).toBeCloseTo(5 / 120, 12)
    })

    it('handles a doubled candidate that lands above the baseline', () => {
      // |65-120|=55, |32.5-120|=87.5, |130-120|=10
      expect(octaveAdjustedTempoError(65, 120)).toBeCloseTo(10 / 120, 12)
    })
  })

  describe('only forgives a single octave', () => {
    it('penalises a candidate of four times the baseline', () => {
      // |480-120|=360, |240-120|=120, |960-120|=840
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1, 12)
    })

    it('penalises a candidate of a quarter of the baseline', () => {
      // |30-120|=90, |15-120|=105, |60-120|=60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5, 12)
    })

    it('penalises a candidate of three times the baseline', () => {
      // |360-120|=240, |180-120|=60, |720-120|=600
      expect(octaveAdjustedTempoError(360, 120)).toBeCloseTo(0.5, 12)
    })
  })

  describe('normalisation', () => {
    it('divides by the baseline, not the candidate', () => {
      expect(octaveAdjustedTempoError(120, 130)).toBeCloseTo(10 / 130, 12)
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('is scale invariant', () => {
      expect(octaveAdjustedTempoError(13, 12)).toBeCloseTo(
        octaveAdjustedTempoError(130, 120),
        12,
      )
    })

    it('can exceed 1 for a very distant candidate', () => {
      // |1000-100|=900, |500-100|=400, |2000-100|=1900
      expect(octaveAdjustedTempoError(1000, 100)).toBeCloseTo(4, 12)
    })

    it('works with non-integer tempos', () => {
      // |121.5-120|=1.5 is smallest
      expect(octaveAdjustedTempoError(121.5, 120)).toBeCloseTo(1.5 / 120, 12)
    })

    it('never returns a negative value', () => {
      for (const candidate of [1, 30, 59, 61, 90, 119, 121, 200, 241, 1000]) {
        expect(octaveAdjustedTempoError(candidate, 120)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('invalid inputs return Infinity', () => {
    it.each([
      ['zero candidate', 0, 120],
      ['negative zero candidate', -0, 120],
      ['negative candidate', -120, 120],
      ['NaN candidate', NaN, 120],
      ['zero baseline', 120, 0],
      ['negative zero baseline', 120, -0],
      ['negative baseline', 120, -120],
      ['NaN baseline', 120, NaN],
      ['both zero', 0, 0],
      ['both negative', -60, -120],
      ['both NaN', NaN, NaN],
      ['negative candidate with NaN baseline', -1, NaN],
    ])('%s', (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(Infinity)
    })

    it('returns Infinity for a negative candidate that would otherwise match an octave', () => {
      // If absolute values were used, -240 / 2 would appear to match -120.
      expect(octaveAdjustedTempoError(-240, -120)).toBe(Infinity)
    })
  })
})
