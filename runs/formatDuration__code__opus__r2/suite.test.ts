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

  describe("under one second", () => {
    it.each([
      [0, "0ms"],
      [1, "1ms"],
      [250, "250ms"],
      [999, "999ms"],
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("one to ten seconds (one decimal place)", () => {
    it.each([
      [1000, "1.0s"],
      [1500, "1.5s"],
      [1234, "1.2s"],
      [9940, "9.9s"],
      [10000, "10.0s"],
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("over ten seconds and under one minute (whole seconds)", () => {
    it.each([
      [10001, "10s"],
      [10500, "11s"],
      [30000, "30s"],
      [45400, "45s"],
      [59000, "59s"],
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("one minute and over", () => {
    it.each([
      [60000, "1m 0s"],
      [61000, "1m 1s"],
      [90000, "1m 30s"],
      [125400, "2m 5s"],
      [3600000, "60m 0s"],
      [3661000, "61m 1s"],
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  // Known bugs: rounding happens after the unit is chosen, so values just
  // below a boundary round up to an out-of-range number. These are marked
  // `it.fails` and will start failing once the implementation is fixed —
  // at that point switch them to plain `it`.
  describe("rounding at unit boundaries (known bugs)", () => {
    it.fails("rounds 59.5s up to 1m 0s rather than 60s", () => {
      expect(formatDuration(59500)).toBe("1m 0s");
    });

    it.fails("rounds 1m 59.5s up to 2m 0s rather than 1m 60s", () => {
      expect(formatDuration(119500)).toBe("2m 0s");
    });
  });
});
