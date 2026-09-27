import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAgo } from "./formatAgo";

const NOW = 1_700_000_000;

describe("formatAgo", () => {
  describe("missing timestamp", () => {
    it("returns an en dash for null", () => {
      expect(formatAgo(null, NOW)).toBe("–");
    });

    it("returns an en dash for undefined", () => {
      expect(formatAgo(undefined, NOW)).toBe("–");
    });
  });

  describe("just now", () => {
    it.each([0, 1, 4])("returns 'just now' for %is elapsed", (s) => {
      expect(formatAgo(NOW - s, NOW)).toBe("just now");
    });

    it("treats future timestamps as zero elapsed", () => {
      expect(formatAgo(NOW + 1, NOW)).toBe("just now");
      expect(formatAgo(NOW + 100_000, NOW)).toBe("just now");
    });
  });

  describe("seconds", () => {
    it.each([
      [5, "5s ago"],
      [30, "30s ago"],
      [59, "59s ago"],
    ])("%is elapsed -> %s", (s, expected) => {
      expect(formatAgo(NOW - s, NOW)).toBe(expected);
    });
  });

  describe("minutes", () => {
    it.each([
      [60, "1m ago"],
      [119, "1m ago"],
      [120, "2m ago"],
      [59 * 60 + 59, "59m ago"],
    ])("%is elapsed -> %s", (s, expected) => {
      expect(formatAgo(NOW - s, NOW)).toBe(expected);
    });
  });

  describe("hours", () => {
    it.each([
      [3600, "1h ago"],
      [2 * 3600 - 1, "1h ago"],
      [2 * 3600, "2h ago"],
      [24 * 3600 - 1, "23h ago"],
    ])("%is elapsed -> %s", (s, expected) => {
      expect(formatAgo(NOW - s, NOW)).toBe(expected);
    });
  });

  describe("days", () => {
    it.each([
      [86400, "1d ago"],
      [2 * 86400 - 1, "1d ago"],
      [12 * 86400, "12d ago"],
      [1000 * 86400, "1000d ago"],
    ])("%is elapsed -> %s", (s, expected) => {
      expect(formatAgo(NOW - s, NOW)).toBe(expected);
    });
  });

  describe("default current time", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("reads the clock when nowS is undefined", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 30)).toBe("30s ago");
      expect(formatAgo(NOW - 30, undefined)).toBe("30s ago");
    });

    it("reads the clock when nowS is null", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 30, null as unknown as undefined)).toBe("30s ago");
    });

    it("rounds the clock down to a whole second", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000 + 999);
      // Floored now is NOW, so 59s elapsed rather than "59.999s ago".
      expect(formatAgo(NOW - 59)).toBe("59s ago");
    });
  });
});
