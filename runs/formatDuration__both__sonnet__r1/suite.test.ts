import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("returns an en dash for null or undefined", () => {
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(undefined)).toBe("–");
  });

  describe("under 1000 ms", () => {
    it("prints the raw number followed by ms", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(1)).toBe("1ms");
      expect(formatDuration(999)).toBe("999ms");
    });
  });

  describe("1000 ms up to under 10 seconds", () => {
    it("uses one decimal place", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(9900)).toBe("9.9s");
    });

    it("chooses the format based on the unrounded value, not the rounded one", () => {
      // 9960 ms is 9.96s, still under 10s, so it keeps the one-decimal format
      // even though rounding the decimal would reach "10.0".
      expect(formatDuration(9960)).toBe("10.0s");
    });
  });

  describe("10 seconds up to under 60 seconds", () => {
    it("rounds to whole seconds", () => {
      expect(formatDuration(10000)).toBe("10s");
      expect(formatDuration(42400)).toBe("42s");
    });

    it("rounds halves up", () => {
      expect(formatDuration(42500)).toBe("43s");
    });

    it("chooses the format based on the unrounded value, not the rounded one", () => {
      // 59600 ms is 59.6s, still under a minute, so it stays in whole-seconds
      // format even though rounding reaches "60".
      expect(formatDuration(59600)).toBe("60s");
    });
  });

  describe("60 seconds and above", () => {
    it("writes whole minutes and rounded remaining seconds", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("rounds the remainder after subtracting whole minutes", () => {
      // 119600 ms is 1 minute plus 59.6s remaining, which rounds to 60,
      // rather than carrying over into an extra minute.
      expect(formatDuration(119600)).toBe("1m 60s");
    });

    it("rounds remainder halves up", () => {
      expect(formatDuration(90500)).toBe("1m 31s");
    });
  });
});
