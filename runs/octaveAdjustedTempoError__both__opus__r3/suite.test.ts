import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("exact and octave matches", () => {
    it.each([60, 120, 240])("returns 0 for candidate %d against baseline 120", (candidate) => {
      expect(octaveAdjustedTempoError(candidate, 120)).toBe(0);
    });
  });

  describe("relative error", () => {
    it("returns the direct difference as a fraction of the baseline", () => {
      expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
      expect(octaveAdjustedTempoError(110, 120)).toBeCloseTo(10 / 120);
    });

    it("uses half the candidate when that is closest", () => {
      // 250 / 2 = 125 -> |125 - 120| = 5
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
    });

    it("uses double the candidate when that is closest", () => {
      // 62 * 2 = 124 -> |124 - 120| = 4
      expect(octaveAdjustedTempoError(62, 120)).toBeCloseTo(4 / 120);
    });

    it("takes the smallest of the three differences", () => {
      // direct: 60, half: 30, double: 300 -> 30
      expect(octaveAdjustedTempoError(180, 120)).toBeCloseTo(30 / 120);
      // direct: 30, half: 75, double: 30 -> 30
      expect(octaveAdjustedTempoError(90, 120)).toBeCloseTo(30 / 120);
    });

    it("does not forgive errors beyond a single octave", () => {
      // 480 / 2 = 240, not 120
      expect(octaveAdjustedTempoError(480, 120)).toBe(1);
      // 30 * 2 = 60, not 120
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5);
    });

    it("is relative to the baseline, not the candidate", () => {
      expect(octaveAdjustedTempoError(110, 100)).toBeCloseTo(0.1);
      expect(octaveAdjustedTempoError(100, 110)).toBeCloseTo(10 / 110);
    });

    it("handles non-integer tempos", () => {
      expect(octaveAdjustedTempoError(120.5, 120)).toBeCloseTo(0.5 / 120);
    });
  });

  describe("invalid inputs", () => {
    it.each([
      ["zero candidate", 0, 120],
      ["negative candidate", -120, 120],
      ["NaN candidate", Number.NaN, 120],
      ["zero baseline", 120, 0],
      ["negative baseline", 120, -120],
      ["NaN baseline", 120, Number.NaN],
      ["both zero", 0, 0],
      ["both NaN", Number.NaN, Number.NaN],
    ])("returns positive Infinity for %s", (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
