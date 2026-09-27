import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("returns the direct error as a fraction of baseline", () => {
    expect(octaveAdjustedTempoError(130, 120)).toBeCloseTo(10 / 120);
  });

  it("returns 0 when candidate equals baseline", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("forgives a half-tempo octave error", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("forgives a double-tempo octave error", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("picks the smallest of the three differences when none match exactly", () => {
    // direct: |100-120|/120 = 20/120
    // half:   |50-120|/120  = 70/120
    // double: |200-120|/120 = 80/120
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120);
  });

  it("returns Infinity when candidate is zero", () => {
    expect(octaveAdjustedTempoError(0, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-10, 120)).toBe(Number.POSITIVE_INFINITY);
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

  it("returns Infinity when both candidate and baseline are invalid", () => {
    expect(octaveAdjustedTempoError(-5, NaN)).toBe(Number.POSITIVE_INFINITY);
  });
});
