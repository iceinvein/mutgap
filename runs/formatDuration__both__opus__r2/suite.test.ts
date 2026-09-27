import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  describe("missing values", () => {
    it("returns an en dash for null", () => {
      expect(formatDuration(null)).toBe("–");
    });

    it("returns an en dash for undefined", () => {
      expect(formatDuration(undefined)).toBe("–");
    });
  });

  describe("under 1000 ms", () => {
    it.each([
      [0, "0ms"],
      [1, "1ms"],
      [500, "500ms"],
      [999, "999ms"],
    ])("%d → %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("prints the number exactly as String() would", () => {
      expect(formatDuration(999.5)).toBe("999.5ms");
      expect(formatDuration(12.25)).toBe("12.25ms");
    });
  });

  describe("1 s up to under 10 s: one decimal place", () => {
    it.each([
      [1000, "1.0s"],
      [1500, "1.5s"],
      [1049, "1.0s"],
      [9900, "9.9s"],
      [9940, "9.9s"],
    ])("%d → %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("chooses the format on the unrounded value", () => {
      expect(formatDuration(9960)).toBe("10.0s");
      expect(formatDuration(9999)).toBe("10.0s");
    });

    it.each([
      [1050, "1.1s"],
      [1150, "1.2s"],
      [1250, "1.3s"],
      [1350, "1.4s"],
      [2450, "2.5s"],
      [9950, "10.0s"],
    ])("rounds halves up (standard rounding): %d → %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("10 s up to under 60 s: whole seconds", () => {
    it.each([
      [10000, "10s"],
      [10400, "10s"],
      [42400, "42s"],
      [59000, "59s"],
    ])("%d → %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("rounds halves up", () => {
      expect(formatDuration(10500)).toBe("11s");
      expect(formatDuration(42500)).toBe("43s");
    });

    it("chooses the format on the unrounded value", () => {
      expect(formatDuration(59600)).toBe("60s");
      expect(formatDuration(59999)).toBe("60s");
    });
  });

  describe("60 s and above: minutes and seconds", () => {
    it.each([
      [60000, "1m 0s"],
      [61000, "1m 1s"],
      [125000, "2m 5s"],
      [600000, "10m 0s"],
      [3600000, "60m 0s"],
      [3725000, "62m 5s"],
    ])("%d → %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("rounds the remaining seconds to a whole number", () => {
      expect(formatDuration(60400)).toBe("1m 0s");
      expect(formatDuration(60500)).toBe("1m 1s");
    });

    it("rounds the remainder after the minutes are taken", () => {
      expect(formatDuration(119600)).toBe("1m 60s");
    });
  });
});
