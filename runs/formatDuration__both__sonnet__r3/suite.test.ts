import { describe, it, expect } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("returns an en dash for null or undefined", () => {
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(undefined)).toBe("–");
  });

  describe("under 1000 ms", () => {
    it("prints the millisecond count as-is", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(1)).toBe("1ms");
      expect(formatDuration(999)).toBe("999ms");
    });
  });

  describe("1s up to under 10s", () => {
    it("uses one decimal place", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(9900)).toBe("9.9s");
    });

    it("chooses the decimal format based on the unrounded value", () => {
      expect(formatDuration(9960)).toBe("10.0s");
      expect(formatDuration(9999)).toBe("10.0s");
    });
  });

  describe("10s up to under 60s", () => {
    it("rounds to whole seconds", () => {
      expect(formatDuration(10000)).toBe("10s");
      expect(formatDuration(42400)).toBe("42s");
    });

    it("rounds halves up", () => {
      expect(formatDuration(10500)).toBe("11s");
    });

    it("chooses the whole-second format based on the unrounded value", () => {
      expect(formatDuration(59600)).toBe("60s");
      expect(formatDuration(59999)).toBe("60s");
    });
  });

  describe("60s and up", () => {
    it("writes whole minutes and rounded remaining seconds", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("rounds the remainder after taking whole minutes", () => {
      expect(formatDuration(119600)).toBe("1m 60s");
    });

    it("handles more than an hour", () => {
      expect(formatDuration(3600000)).toBe("60m 0s");
    });
  });
});
