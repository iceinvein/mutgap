import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  describe("valid inputs", () => {
    it("returns 0 when candidate equals baseline", () => {
      expect(octaveAdjustedTempoError(120, 120)).toBe(0);
    });

    it("returns 0 when candidate is double the baseline", () => {
      expect(octaveAdjustedTempoError(240, 120)).toBe(0);
    });

    it("returns 0 when candidate is half the baseline", () => {
      expect(octaveAdjustedTempoError(60, 120)).toBe(0);
    });

    it("returns the relative error for a near match", () => {
      expect(octaveAdjustedTempoError(126, 120)).toBeCloseTo(0.05);
      expect(octaveAdjustedTempoError(114, 120)).toBeCloseTo(0.05);
    });

    it("returns the relative error for a near octave match", () => {
      // 250 / 2 = 125 -> |125 - 120| / 120
      expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
      // 55 * 2 = 110 -> |110 - 120| / 120
      expect(octaveAdjustedTempoError(55, 120)).toBeCloseTo(10 / 120);
    });

    it("picks the smallest of the direct, halved and doubled errors", () => {
      // direct: 60, halved: 30, doubled: 240 -> 30
      expect(octaveAdjustedTempoError(180, 120)).toBeCloseTo(30 / 120);
      // direct: 30, halved: 75, doubled: 60 -> 30
      expect(octaveAdjustedTempoError(90, 120)).toBeCloseTo(30 / 120);
    });

    it("only adjusts by a single octave", () => {
      // 4x: best is halving -> |2b - b| / b = 1
      expect(octaveAdjustedTempoError(480, 120)).toBe(1);
      // 1/4x: best is doubling -> |b/2 - b| / b = 0.5
      expect(octaveAdjustedTempoError(30, 120)).toBe(0.5);
    });

    it("is scale invariant", () => {
      expect(octaveAdjustedTempoError(130, 100)).toBeCloseTo(
        octaveAdjustedTempoError(13, 10),
      );
    });

    it("returns 1 for a zero candidate", () => {
      expect(octaveAdjustedTempoError(0, 120)).toBe(1);
    });

    it("handles non-integer tempos", () => {
      expect(octaveAdjustedTempoError(97.5, 97.5)).toBe(0);
      expect(octaveAdjustedTempoError(195, 97.5)).toBe(0);
    });
  });

  describe("invalid inputs", () => {
    it("returns Infinity for a negative candidate", () => {
      expect(octaveAdjustedTempoError(-120, 120)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("returns Infinity for a zero baseline", () => {
      expect(octaveAdjustedTempoError(120, 0)).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns Infinity for a negative baseline", () => {
      expect(octaveAdjustedTempoError(120, -120)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("returns Infinity for NaN inputs", () => {
      expect(octaveAdjustedTempoError(Number.NaN, 120)).toBe(
        Number.POSITIVE_INFINITY,
      );
      expect(octaveAdjustedTempoError(120, Number.NaN)).toBe(
        Number.POSITIVE_INFINITY,
      );
      expect(octaveAdjustedTempoError(Number.NaN, Number.NaN)).toBe(
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
