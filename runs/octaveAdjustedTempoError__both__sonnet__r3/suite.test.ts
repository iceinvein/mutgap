import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("computes the direct error as a fraction of baseline", () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
  });

  it("forgives a half-tempo octave error", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("gives zero error when candidate equals baseline", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("forgives a double-tempo octave error", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("picks the smallest of the three candidate comparisons", () => {
    // direct: |100-120|=20, half: |50-120|=70, double: |200-120|=80 -> smallest is direct
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120);
  });

  it("returns Infinity when candidate is zero", () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-130, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is NaN", () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is zero", () => {
    expect(octaveAdjustedTempoError(130, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is negative", () => {
    expect(octaveAdjustedTempoError(130, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is NaN", () => {
    expect(octaveAdjustedTempoError(130, NaN)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when both inputs are invalid", () => {
    expect(octaveAdjustedTempoError(NaN, NaN)).toBe(Number.POSITIVE_INFINITY);
  });
});
