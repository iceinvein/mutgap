import { describe, it, expect } from "vitest";
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

  describe("1s to 10s", () => {
    it.each([
      [1000, "1.0s"],
      [1500, "1.5s"],
      [1234, "1.2s"],
      [9999, "10.0s"],
      [10000, "10.0s"],
    ])("formats %d with one decimal as %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("over 10s and under a minute", () => {
    it.each([
      [10001, "10s"],
      [10500, "11s"],
      [15000, "15s"],
      [45499, "45s"],
      [59000, "59s"],
    ])("formats %d as whole seconds %s", (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe("one minute and above", () => {
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
});
