import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAgo } from "./formatAgo";

const NOW = 1_700_000_000;
const ago = (seconds: number) => formatAgo(NOW - seconds, NOW);

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
    it.each([0, 1, 4])("returns 'just now' for %ds elapsed", (s) => {
      expect(ago(s)).toBe("just now");
    });

    it("treats a future timestamp as zero elapsed", () => {
      expect(formatAgo(NOW + 1, NOW)).toBe("just now");
      expect(formatAgo(NOW + 100_000, NOW)).toBe("just now");
    });
  });

  describe("seconds", () => {
    it.each([
      [5, "5s ago"],
      [6, "6s ago"],
      [30, "30s ago"],
      [59, "59s ago"],
    ])("%ds elapsed -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("minutes", () => {
    it.each([
      [60, "1m ago"],
      [119, "1m ago"],
      [120, "2m ago"],
      [59 * 60, "59m ago"],
      [60 * 60 - 1, "59m ago"],
    ])("%ds elapsed -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("hours", () => {
    it.each([
      [3600, "1h ago"],
      [2 * 3600 - 1, "1h ago"],
      [2 * 3600, "2h ago"],
      [23 * 3600, "23h ago"],
      [24 * 3600 - 1, "23h ago"],
    ])("%ds elapsed -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("days", () => {
    it.each([
      [86_400, "1d ago"],
      [2 * 86_400 - 1, "1d ago"],
      [12 * 86_400, "12d ago"],
      [365 * 86_400, "365d ago"],
      [10_000 * 86_400, "10000d ago"],
    ])("%ds elapsed -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("current time from the clock", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses the clock when nowS is undefined", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 90)).toBe("1m ago");
      expect(formatAgo(NOW - 90, undefined)).toBe("1m ago");
    });

    it("uses the clock when nowS is null", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 90, null as unknown as undefined)).toBe("1m ago");
    });

    it("rounds the clock down to a whole second", () => {
      vi.useFakeTimers();
      // 6.999s after the timestamp should floor to 6s elapsed.
      vi.setSystemTime((NOW + 6) * 1000 + 999);
      expect(formatAgo(NOW)).toBe("6s ago");
      // 59.999s after should floor to 59s, not tip into minutes.
      vi.setSystemTime((NOW + 59) * 1000 + 999);
      expect(formatAgo(NOW)).toBe("59s ago");
    });
  });
});
