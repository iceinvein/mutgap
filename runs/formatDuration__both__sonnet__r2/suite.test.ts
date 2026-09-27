import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("returns an en dash for null or undefined", () => {
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(undefined)).toBe("–");
  });

  describe("under 1000 ms", () => {
    it("prints the millisecond count as-is", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(999)).toBe("999ms");
    });
  });

  describe("1s to under 10s", () => {
    it("uses one decimal place", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(9900)).toBe("9.9s");
    });

    it("chooses the format based on the unrounded value", () => {
      // 9960ms = 9.96s, which is <= 10s, so it still gets one decimal
      // place, rounding up to "10.0s" rather than switching to "10s".
      expect(formatDuration(9960)).toBe("10.0s");
    });
  });

  describe("10s to under 60s", () => {
    it("rounds to whole seconds", () => {
      expect(formatDuration(10000)).toBe("10s");
      expect(formatDuration(42400)).toBe("42s");
    });

    it("rounds halves up", () => {
      expect(formatDuration(10500)).toBe("11s");
    });

    it("chooses the format based on the unrounded value", () => {
      // 59600ms = 59.6s, which is still under a minute, so it formats
      // as whole seconds and rounds up to "60s" rather than "1m 0s".
      expect(formatDuration(59600)).toBe("60s");
    });
  });

  describe("60s and above", () => {
    it("writes whole minutes and remaining seconds", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("rounds the remainder after the minutes are taken", () => {
      // 119600ms = 1m 59.6s; the remainder rounds up to 60 independently
      // of the minutes, giving "1m 60s" rather than rolling into 2m.
      expect(formatDuration(119600)).toBe("1m 60s");
    });
  });
});
