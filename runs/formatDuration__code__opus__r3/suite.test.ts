import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  describe("missing values", () => {
    it("returns a dash for null", () => {
      expect(formatDuration(null)).toBe("–");
    });

    it("returns a dash for undefined", () => {
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

  describe("up to ten seconds", () => {
    it.each([
      [1000, "1.0s"],
      [1234, "1.2s"],
      [1250, "1.3s"],
      [5500, "5.5s"],
      [9990, "10.0s"],
      [10000, "10.0s"],
    ])("formats %d with one decimal as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("over ten seconds and under one minute", () => {
    it.each([
      [10001, "10s"],
      [10500, "11s"],
      [30000, "30s"],
      [45400, "45s"],
      [59000, "59s"],
    ])("formats %d as whole seconds %s", (ms, expected) => {
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
      [3723000, "62m 3s"],
    ])("formats %d as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });
});
