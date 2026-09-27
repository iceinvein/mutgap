import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("octave forgiveness", () => {
    it.each([60, 120, 240])("returns 0 for candidate %d against baseline 120", (candidate) => {
      expect(octaveAdjustedTempoError(candidate, 120)).toBe(0);
    });

    it("does not forgive quadruple or quarter tempo", () => {
      // 480: |480-120|, |240-120|, |960-120| -> min 120
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1);
      // 30: |30-120|, |15-120|, |60-120| -> min 60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5);
    });
  });

  describe("relative error", () => {
    it("gives 10/120 for candidate 130 against baseline 120", () => {
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
    });

    it("uses the direct difference when it is smallest, above or below", () => {
      expect(octaveAdjustedTempoError(110, 120)).toBeCloseTo(10 / 120);
    });

    it("uses half the candidate when that is closest", () => {
      // 250 / 2 = 125 -> |125 - 120| = 5
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
    });

    it("uses double the candidate when that is closest", () => {
      // 58 * 2 = 116 -> |116 - 120| = 4
      expect(octaveAdjustedTempoError(58, 120)).toBeCloseTo(4 / 120);
    });

    it("divides by the baseline, not the candidate", () => {
      // Same absolute gap of 10 BPM, different baselines.
      expect(octaveAdjustedTempoError(90, 100)).toBeCloseTo(0.1);
      expect(octaveAdjustedTempoError(190, 200)).toBeCloseTo(0.05);
    });

    it("works with fractional tempos", () => {
      expect(octaveAdjustedTempoError(121.5, 120)).toBeCloseTo(1.5 / 120);
    });
  });

  describe("invalid inputs return +Infinity", () => {
    const cases: Array<[string, number, number]> = [
      ["zero candidate", 0, 120],
      ["zero baseline", 120, 0],
      ["negative zero candidate", -0, 120],
      ["negative zero baseline", 120, -0],
      ["negative candidate", -120, 120],
      ["negative baseline", 120, -120],
      ["both negative", -120, -120],
      ["NaN candidate", Number.NaN, 120],
      ["NaN baseline", 120, Number.NaN],
      ["both zero", 0, 0],
    ];

    it.each(cases)("%s", (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
