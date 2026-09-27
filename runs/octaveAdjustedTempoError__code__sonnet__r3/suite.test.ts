import { describe, expect, it } from "vitest";
import { octaveAdjustedTempoError } from "./octaveAdjustedTempoError";

describe("octaveAdjustedTempoError", () => {
  it("returns 0 when candidate exactly matches baseline", () => {
    expect(octaveAdjustedTempoError(120, 120)).toBe(0);
  });

  it("returns 0 when candidate is half the baseline (octave down)", () => {
    expect(octaveAdjustedTempoError(60, 120)).toBe(0);
  });

  it("returns 0 when candidate is double the baseline (octave up)", () => {
    expect(octaveAdjustedTempoError(240, 120)).toBe(0);
  });

  it("computes the relative error using the closest octave option", () => {
    // |100-120|=20, |50-120|=70, |200-120|=80 -> min is 20, /120
    expect(octaveAdjustedTempoError(100, 120)).toBeCloseTo(20 / 120);
  });

  it("picks the halved-candidate option when it is closest", () => {
    // candidate=200, baseline=110 -> |200-110|=90, |100-110|=10, |400-110|=290 -> min 10
    expect(octaveAdjustedTempoError(200, 110)).toBeCloseTo(10 / 110);
  });

  it("picks the doubled-candidate option when it is closest", () => {
    // candidate=50, baseline=110 -> |50-110|=60, |25-110|=85, |100-110|=10 -> min 10
    expect(octaveAdjustedTempoError(50, 110)).toBeCloseTo(10 / 110);
  });

  it("handles candidate of 0 with a positive baseline", () => {
    expect(octaveAdjustedTempoError(0, 10)).toBe(1);
  });

  it("returns Infinity when baseline is 0", () => {
    expect(octaveAdjustedTempoError(120, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is negative", () => {
    expect(octaveAdjustedTempoError(120, -120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is negative", () => {
    expect(octaveAdjustedTempoError(-1, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when candidate is NaN", () => {
    expect(octaveAdjustedTempoError(NaN, 120)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity when baseline is NaN", () => {
    expect(octaveAdjustedTempoError(120, NaN)).toBe(Number.POSITIVE_INFINITY);
  });
});
