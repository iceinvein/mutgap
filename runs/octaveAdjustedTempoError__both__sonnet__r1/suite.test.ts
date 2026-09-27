import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("returns 0 for an exact match", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("computes the plain relative error when it is the smallest", () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
  });

  it("forgives a candidate at half the baseline", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("forgives a candidate at double the baseline", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("uses the smallest of the three differences when none is exact", () => {
    // |100-120|=20, |50-120|=70, |200-120|=80 -> min is 20, /120
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120);
  });

  it("picks the half-candidate error when it is smallest", () => {
    // candidate 121 vs baseline 60: |121-60|=61, |60.5-60|=0.5, |242-60|=182
    expect(octaveAdjustedTempoError(121, 60)).toBeCloseTo(0.5 / 60);
  });

  it("returns Infinity when candidate is zero", () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-60, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is NaN", () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is zero", () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is negative", () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is NaN", () => {
    expect(octaveAdjustedTempoError(120, NaN)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when both inputs are invalid", () => {
    expect(octaveAdjustedTempoError(NaN, NaN)).toBe(Number.POSITIVE_INFINITY);
  });
});
