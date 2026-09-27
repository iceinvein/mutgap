import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("direct match", () => {
    it("returns 0 when candidate equals baseline", () => {
      expect(octaveAdjustedTempoError(120, 120)).toBe(0);
    });

    it("returns relative error for a nearby candidate", () => {
      expect(octaveAdjustedTempoError(126, 120)).toBeCloseTo(0.05);
      expect(octaveAdjustedTempoError(114, 120)).toBeCloseTo(0.05);
    });

    it("is relative to the baseline, not the candidate", () => {
      // |110 - 100| / 100, not / 110
      expect(octaveAdjustedTempoError(110, 100)).toBeCloseTo(0.1);
      expect(octaveAdjustedTempoError(90, 100)).toBeCloseTo(0.1);
    });
  });

  describe("octave errors", () => {
    it("returns 0 when candidate is exactly double the baseline", () => {
      expect(octaveAdjustedTempoError(240, 120)).toBe(0);
    });

    it("returns 0 when candidate is exactly half the baseline", () => {
      expect(octaveAdjustedTempoError(60, 120)).toBe(0);
    });

    it("measures error against the halved candidate when near double", () => {
      // 250 / 2 = 125 -> |125 - 120| / 120
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
    });

    it("measures error against the doubled candidate when near half", () => {
      // 62 * 2 = 124 -> |124 - 120| / 120
      expect(octaveAdjustedTempoError(62, 120)).toBeCloseTo(4 / 120);
    });

    it("only corrects by a single octave", () => {
      // 480 is two octaves up: best is 480 / 2 = 240 -> |240 - 120| / 120 = 1
      expect(octaveAdjustedTempoError(480, 120)).toBeCloseTo(1);
      // 30 is two octaves down: best is 30 * 2 = 60 -> |60 - 120| / 120 = 0.5
      expect(octaveAdjustedTempoError(30, 120)).toBeCloseTo(0.5);
    });

    it("picks the smallest of the three interpretations", () => {
      // 170: direct 50, halved |85-120|=35, doubled |340-120|=220 -> 35
      expect(octaveAdjustedTempoError(170, 120)).toBeCloseTo(35 / 120);
      // 90: direct 30, halved |45-120|=75, doubled |180-120|=60 -> 30
      expect(octaveAdjustedTempoError(90, 120)).toBeCloseTo(30 / 120);
    });
  });

  describe("boundary values", () => {
    it("returns 1 for a zero candidate", () => {
      expect(octaveAdjustedTempoError(0, 120)).toBe(1);
    });

    it("works with fractional tempos", () => {
      expect(octaveAdjustedTempoError(0.5, 1)).toBe(0);
      expect(octaveAdjustedTempoError(99.5, 100)).toBeCloseTo(0.005);
    });

    it("returns Infinity for an infinite candidate", () => {
      expect(octaveAdjustedTempoError(Number.POSITIVE_INFINITY, 120)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("is never negative", () => {
      for (const candidate of [0, 1, 37, 60, 119, 120, 121, 240, 1000]) {
        expect(octaveAdjustedTempoError(candidate, 120)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("invalid input", () => {
    it.each([
      ["negative candidate", -120, 120],
      ["NaN candidate", Number.NaN, 120],
      ["negative infinite candidate", Number.NEGATIVE_INFINITY, 120],
      ["zero baseline", 120, 0],
      ["negative baseline", 120, -120],
      ["NaN baseline", 120, Number.NaN],
      ["both NaN", Number.NaN, Number.NaN],
    ])("returns Infinity for %s", (_label, candidate, baseline) => {
      expect(octaveAdjustedTempoError(candidate, baseline)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });
  });
});
