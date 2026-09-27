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

  describe('direct comparison', () => {
    it('is 0 when candidate equals baseline', () => {
      expect(octaveAdjustedTempoError(97.5, 97.5)).toBe(0)
    })

    it('uses the absolute difference when the candidate is below the baseline', () => {
      // |110 - 120| = 10, |55 - 120| = 65, |220 - 120| = 100
      expect(octaveAdjustedTempoError(110, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('uses the absolute difference when the candidate is above the baseline', () => {
      // |85 - 120| = 35, |42.5 - 120| = 77.5, |170 - 120| = 50
      expect(octaveAdjustedTempoError(85, 120)).toBeCloseTo(35 / 120, 12)
    })

    it('picks the direct difference when it is the smallest of the three', () => {
      // |90 - 120| = 30, |45 - 120| = 75, |180 - 120| = 60
      expect(octaveAdjustedTempoError(90, 120)).toBeCloseTo(30 / 120, 12)
    })
  })

  describe('octave forgiveness', () => {
    it('uses half the candidate when that is closest (candidate roughly doubled)', () => {
      // |250 - 120| = 130, |125 - 120| = 5, |500 - 120| = 380
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120, 12)
    })

    it('uses half the candidate when it beats the direct difference by a small margin', () => {
      // |170 - 100| = 70, |85 - 100| = 15, |340 - 100| = 240
      expect(octaveAdjustedTempoError(170, 100)).toBeCloseTo(15 / 100, 12)
    })

    it('uses double the candidate when that is closest (candidate roughly halved)', () => {
      // |55 - 120| = 65, |27.5 - 120| = 92.5, |110 - 120| = 10
      expect(octaveAdjustedTempoError(55, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('uses double the candidate when the doubled value overshoots the baseline', () => {
      // |65 - 120| = 55, |32.5 - 120| = 87.5, |130 - 120| = 10
      expect(octaveAdjustedTempoError(65, 120)).toBeCloseTo(10 / 120, 12)
    })

    it('only forgives a single octave upwards (quadruple tempo is penalised)', () => {
      // |480 - 120| = 360, |240 - 120| = 120, |960 - 120| = 840
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1, 12)
    })

    it('only forgives a single octave downwards (quarter tempo is penalised)', () => {
      // |30 - 120| = 90, |15 - 120| = 105, |60 - 120| = 60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5, 12)
    })

    it('does not forgive other ratios such as 3:2', () => {
      // |180 - 120| = 60, |90 - 120| = 30, |360 - 120| = 240
      expect(octaveAdjustedTempoError(180, 120)).toBeCloseTo(0.25, 12)
    })
  })

  describe('normalisation by baseline', () => {
    it('divides by the baseline, not the candidate', () => {
      // min(|100 - 80|, |50 - 80|, |200 - 80|) = 20 → 20 / 80
      expect(octaveAdjustedTempoError(100, 80)).toBeCloseTo(0.25, 12)
    })

    it('is scale-invariant when both inputs are scaled together', () => {
      const a = octaveAdjustedTempoError(130, 120)
      const b = octaveAdjustedTempoError(1.3, 1.2)
      const c = octaveAdjustedTempoError(1300, 1200)
      expect(b).toBeCloseTo(a, 12)
      expect(c).toBeCloseTo(a, 12)
    })

    it('can exceed 1 for very distant candidates', () => {
      // |1000 - 10| = 990, |500 - 10| = 490, |2000 - 10| = 1990
      expect(octaveAdjustedTempoError(1000, 10)).toBeCloseTo(49, 12)
    })

    it('handles non-integer tempos', () => {
      // |123.4 - 120| = 3.4 is the smallest
      expect(octaveAdjustedTempoError(123.4, 120)).toBeCloseTo(3.4 / 120, 12)
    })

    it('never returns a negative value for valid inputs', () => {
      const pairs: Array<[number, number]> = [
        [1, 1000],
        [1000, 1],
        [59, 120],
        [121, 120],
        [0.001, 0.002],
      ]
      for (const [candidate, baseline] of pairs) {
        expect(octaveAdjustedTempoError(candidate, baseline)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('invalid inputs', () => {
    it.each([
      ['zero candidate', 0, 120],
      ['negative zero candidate', -0, 120],
      ['negative candidate', -120, 120],
      ['NaN candidate', Number.NaN, 120],
      ['zero baseline', 120, 0],
      ['negative zero baseline', 120, -0],
      ['negative baseline', 120, -120],
      ['NaN baseline', 120, Number.NaN],
      ['both zero', 0, 0],
      ['both negative', -60, -120],
      ['both NaN', Number.NaN, Number.NaN],
      ['negative candidate that would match via absolute value', -240, 120],
      ['tiny negative candidate', -Number.MIN_VALUE, 120],
      ['negative infinity candidate', Number.NEGATIVE_INFINITY, 120],
      ['negative infinity baseline', 120, Number.NEGATIVE_INFINITY],
    ])('returns positive Infinity for %s', (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(Number.POSITIVE_INFINITY)
    })

    it('does not throw for invalid inputs', () => {
      expect(() => octaveAdjustedTempoError(0, 0)).not.toThrow()
      expect(() => octaveAdjustedTempoError(Number.NaN, -1)).not.toThrow()
    })
  })
})
