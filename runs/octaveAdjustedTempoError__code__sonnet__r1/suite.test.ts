import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("returns 0 when candidate exactly matches baseline", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("returns 0 when candidate is exactly half the baseline (octave down)", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("returns 0 when candidate is exactly double the baseline (octave up)", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("computes relative error against the closest of candidate, half, and double", () => {
    // |100-120|=20, |50-120|=70, |200-120|=80 -> min is 20, /120
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120);
  });

  it("picks the halved candidate when that is closest to baseline", () => {
    // candidate=130, baseline=60: direct=70, half=|65-60|=5, double=|260-60|=200
    expect(octaveAdjustedTempoError(130, 60)).toBeCloseTo(5 / 60);
  });

  it("picks the doubled candidate when that is closest to baseline", () => {
    // candidate=65, baseline=120: direct=55, half=|32.5-120|=87.5, double=|130-120|=10
    expect(octaveAdjustedTempoError(65, 120)).toBeCloseTo(10 / 120);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-1, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is zero", () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is negative", () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("allows candidate to be zero", () => {
    expect(octaveAdjustedTempoError(0, 120)).toBeCloseTo(1);
  });

  it("returns Infinity when candidate is NaN", () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Number.POSITIVE_INFINITY);
  });
});
