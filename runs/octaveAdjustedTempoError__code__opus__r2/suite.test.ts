import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("exact matches", () => {
    it("returns 0 when candidate equals baseline", () => {
      expect(octaveAdjustedTempoError(120, 120)).toBe(0);
    });

    it("returns 0 when candidate is double the baseline", () => {
      expect(octaveAdjustedTempoError(240, 120)).toBe(0);
    });

    it("returns 0 when candidate is half the baseline", () => {
      expect(octaveAdjustedTempoError(60, 120)).toBe(0);
    });
  });

  describe("relative error", () => {
    it("returns the relative error for a near match at the same octave", () => {
      expect(octaveAdjustedTempoError(126, 120)).toBeCloseTo(0.05);
      expect(octaveAdjustedTempoError(114, 120)).toBeCloseTo(0.05);
    });

    it("uses the halved candidate when it is closest", () => {
      // |250 - 120| = 130, |125 - 120| = 5, |500 - 120| = 380
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
    });

    it("uses the doubled candidate when it is closest", () => {
      // |58 - 120| = 62, |29 - 120| = 91, |116 - 120| = 4
      expect(octaveAdjustedTempoError(58, 120)).toBeCloseTo(4 / 120);
    });

    it("is normalised by the baseline, so it is scale-invariant", () => {
      expect(octaveAdjustedTempoError(105, 100)).toBeCloseTo(0.05);
      expect(octaveAdjustedTempoError(210, 200)).toBeCloseTo(0.05);
    });

    it("only corrects a single octave in either direction", () => {
      // 4x and 1/4x are not treated as octave matches.
      // 480: min(360, 120, 840) = 120
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1);
      // 30: min(90, 105, 60) = 60
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5);
    });

    it("does not treat non-octave ratios as matches", () => {
      // 3x: min(240, 60, 600) = 60
      expect(octaveAdjustedTempoError(360, 120)).toBeCloseTo(0.5);
    });

    it("returns 1 for a zero candidate", () => {
      expect(octaveAdjustedTempoError(0, 120)).toBe(1);
    });

    it("is never negative", () => {
      for (const candidate of [0, 1, 50, 59.9, 60, 119, 121, 240, 1000]) {
        expect(octaveAdjustedTempoError(candidate, 120)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("invalid input", () => {
    it.each([
      ["negative candidate", -120, 120],
      ["NaN candidate", Number.NaN, 120],
      ["zero baseline", 120, 0],
      ["negative baseline", 120, -120],
      ["NaN baseline", 120, Number.NaN],
      ["both invalid", -1, 0],
    ])("returns Infinity for %s", (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("returns Infinity for an infinite candidate", () => {
      expect(octaveAdjustedTempoError(Number.POSITIVE_INFINITY, 120)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });
  });
});
