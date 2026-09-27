import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("returns 0 when candidate exactly matches baseline", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("returns the relative error when candidate is within an octave of baseline", () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
  });

  it("treats a candidate at double the baseline as zero error (octave up)", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("treats a candidate at half the baseline as zero error (octave down)", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("picks the smallest error among direct, half, and double comparisons", () => {
    // candidate=125: |125-120|=5, |62.5-120|=57.5, |250-120|=130 -> min is direct diff
    expect(octaveAdjustedTempoError(125, 120)).toBeCloseTo(5 / 120);
  });

  it("picks the halved comparison when candidate is near double the baseline", () => {
    // candidate=250, baseline=120: |250-120|=130, |125-120|=5, |500-120|=380 -> min is halved
    expect(octaveAdjustedTempoError(250, 120)).toBeCloseTo(5 / 120);
  });

  it("picks the doubled comparison when candidate is near half the baseline", () => {
    // candidate=58, baseline=120: |58-120|=62, |29-120|=91, |116-120|=4 -> min is doubled
    expect(octaveAdjustedTempoError(58, 120)).toBeCloseTo(4 / 120);
  });

  it("returns 0 when candidate is 0 and baseline is 0... is not allowed (baseline must be > 0)", () => {
    expect(octaveAdjustedTempoError(0, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("handles a candidate of 0 with a positive baseline", () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(1);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-10, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is zero", () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is negative", () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when both candidate and baseline are negative", () => {
    expect(octaveAdjustedTempoError(-120, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns a non-negative value for arbitrary positive inputs", () => {
    const result = octaveAdjustedTempoError(97, 143);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result)).toBe(true);
  });
});
