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
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("1 s up to under 10 s", () => {
    it.each([
      [1000, "1.0s"],
      [1500, "1.5s"],
      [1049, "1.0s"],
      [1234, "1.2s"],
      [9900, "9.9s"],
      [9999, "10.0s"],
    ])("formats %d as %s with one decimal place", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it.each([
      [1150, "1.2s"],
      [1450, "1.5s"],
      [2550, "2.6s"],
      [8150, "8.2s"],
    ])("rounds halves up: %d gives %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("chooses the format on the unrounded value (9960 ms)", () => {
      expect(formatDuration(9960)).toBe("10.0s");
    });

    it("chooses the format on the unrounded value (9950 ms)", () => {
      expect(formatDuration(9950)).toBe("10.0s");
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
      [59400, "59s"],
    ])("formats %d as %s in whole seconds", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("chooses the format on the unrounded value (59600 ms)", () => {
      expect(formatDuration(59600)).toBe("60s");
    });

    it("stays in seconds just under a minute", () => {
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
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });

    it("rounds minutes down", () => {
      expect(formatDuration(119000)).toBe("1m 59s");
    });

    it("rounds the remainder after taking minutes (119600 ms)", () => {
      expect(formatDuration(119600)).toBe("1m 60s");
    });
  });
});
