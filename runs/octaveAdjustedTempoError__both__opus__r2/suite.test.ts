import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("exact and octave matches", () => {
    it.each([60, 120, 240])("returns 0 for candidate %d against baseline 120", (candidate) => {
      expect(octaveAdjustedTempoError(candidate, 120)).toBe(0);
    });
  });

  describe("relative error", () => {
    it("returns 10 / 120 for candidate 130 against baseline 120", () => {
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
    });

    it("measures candidates below the baseline", () => {
      expect(octaveAdjustedTempoError(110, 120)).toBeCloseTo(10 / 120);
    });

    it("uses half the candidate when it is closest", () => {
      // |250 - 120| = 130, |125 - 120| = 5, |500 - 120| = 380
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
    });

    it("uses double the candidate when it is closest", () => {
      // |58 - 120| = 62, |29 - 120| = 91, |116 - 120| = 4
      expect(octaveAdjustedTempoError(58, 120)).toBeCloseTo(4 / 120);
    });

    it("picks the smallest of the three differences", () => {
      // candidate 90: direct 30, half 75, double 60 → 30
      expect(octaveAdjustedTempoError(90, 120)).toBeCloseTo(30 / 120);
      // candidate 170: direct 50, half 35, double 220 → 35
      expect(octaveAdjustedTempoError(170, 120)).toBeCloseTo(35 / 120);
    });

    it("does not forgive octave errors beyond a factor of two", () => {
      // candidate 30 (quarter tempo): direct 90, half 105, double 60 → 60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(60 / 120);
      // candidate 480 (quadruple tempo): direct 360, half 120, double 840 → 120
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1);
    });

    it("is expressed as a fraction of the baseline", () => {
      expect(octaveAdjustedTempoError(110, 100)).toBeCloseTo(0.1);
      expect(octaveAdjustedTempoError(220, 200)).toBeCloseTo(0.1);
    });

    it("works with non-integer tempos", () => {
      expect(octaveAdjustedTempoError(121.5, 120)).toBeCloseTo(1.5 / 120);
    });

    it("returns a non-negative finite number for valid inputs", () => {
      const result = octaveAdjustedTempoError(97, 133);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe("invalid inputs return positive Infinity", () => {
    it.each([
      ["zero candidate", 0, 120],
      ["negative candidate", -120, 120],
      ["NaN candidate", NaN, 120],
      ["zero baseline", 120, 0],
      ["negative baseline", 120, -120],
      ["NaN baseline", 120, NaN],
      ["both zero", 0, 0],
      ["both NaN", NaN, NaN],
      ["negative zero candidate", -0, 120],
    ])("%s", (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
