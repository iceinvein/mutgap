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
      [999.5, "999.5ms"],
    ])("formats %s as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("1 s up to under 10 s", () => {
    it.each([
      [1000, "1.0s"],
      [1500, "1.5s"],
      [1040, "1.0s"],
      [1060, "1.1s"],
      [2250, "2.3s"],
      [9900, "9.9s"],
      [9940, "9.9s"],
    ])("formats %s with one decimal as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("chooses the format on the unrounded value (9960 -> 10.0s)", () => {
      expect(formatDuration(9960)).toBe("10.0s");
    });

    it("formats 9999 as 10.0s", () => {
      expect(formatDuration(9999)).toBe("10.0s");
    });
  });

  describe("10 s up to under 60 s", () => {
    it.each([
      [10000, "10s"],
      [10001, "10s"],
      [10400, "10s"],
      [10500, "11s"],
      [42400, "42s"],
      [42500, "43s"],
      [59000, "59s"],
    ])("formats %s as whole seconds %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("chooses the format on the unrounded value (59600 -> 60s)", () => {
      expect(formatDuration(59600)).toBe("60s");
    });

    it("formats 59999 as 60s", () => {
      expect(formatDuration(59999)).toBe("60s");
    });
  });

  describe("60 s and over", () => {
    it.each([
      [60000, "1m 0s"],
      [61000, "1m 1s"],
      [90000, "1m 30s"],
      [125000, "2m 5s"],
      [125400, "2m 5s"],
      [125500, "2m 6s"],
      [3600000, "60m 0s"],
      [3725000, "62m 5s"],
    ])("formats %s as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("rounds minutes down", () => {
      expect(formatDuration(119000)).toBe("1m 59s");
    });

    it("rounds the remainder after taking minutes (119600 -> 1m 60s)", () => {
      expect(formatDuration(119600)).toBe("1m 60s");
    });
  });
});
