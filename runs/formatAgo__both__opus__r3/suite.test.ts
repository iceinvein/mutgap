import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAgo } from "./formatAgo";

const NOW = 1_700_000_000;
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("missing timestamp", () => {
    it("returns an en dash for null", () => {
      expect(formatAgo(null, NOW)).toBe("–");
    });

    it("returns an en dash for undefined", () => {
      expect(formatAgo(undefined, NOW)).toBe("–");
    });
  });

  describe("just now", () => {
    it("returns 'just now' for 0 seconds", () => {
      expect(formatAgo(NOW, NOW)).toBe("just now");
    });

    it("returns 'just now' for 4 seconds", () => {
      expect(formatAgo(NOW - 4, NOW)).toBe("just now");
    });

    it("treats future timestamps as zero elapsed", () => {
      expect(formatAgo(NOW + 1, NOW)).toBe("just now");
      expect(formatAgo(NOW + 10 * DAY, NOW)).toBe("just now");
    });
  });

  describe("seconds", () => {
    it("returns '5s ago' at exactly 5 seconds", () => {
      expect(formatAgo(NOW - 5, NOW)).toBe("5s ago");
    });

    it("returns seconds in the middle of the range", () => {
      expect(formatAgo(NOW - 30, NOW)).toBe("30s ago");
    });

    it("returns '59s ago' at 59 seconds", () => {
      expect(formatAgo(NOW - 59, NOW)).toBe("59s ago");
    });
  });

  describe("minutes", () => {
    it("returns '1m ago' at exactly 60 seconds", () => {
      expect(formatAgo(NOW - 60, NOW)).toBe("1m ago");
    });

    it("rounds minutes down", () => {
      expect(formatAgo(NOW - 119, NOW)).toBe("1m ago");
      expect(formatAgo(NOW - 120, NOW)).toBe("2m ago");
    });

    it("returns '59m ago' just under an hour", () => {
      expect(formatAgo(NOW - (HOUR - 1), NOW)).toBe("59m ago");
    });
  });

  describe("hours", () => {
    it("returns '1h ago' at exactly 60 minutes", () => {
      expect(formatAgo(NOW - HOUR, NOW)).toBe("1h ago");
    });

    it("rounds hours down", () => {
      expect(formatAgo(NOW - (2 * HOUR - 1), NOW)).toBe("1h ago");
      expect(formatAgo(NOW - 2 * HOUR, NOW)).toBe("2h ago");
    });

    it("returns '23h ago' just under a day", () => {
      expect(formatAgo(NOW - (DAY - 1), NOW)).toBe("23h ago");
    });
  });

  describe("days", () => {
    it("returns '1d ago' at exactly 24 hours", () => {
      expect(formatAgo(NOW - DAY, NOW)).toBe("1d ago");
    });

    it("rounds days down", () => {
      expect(formatAgo(NOW - (2 * DAY - 1), NOW)).toBe("1d ago");
    });

    it("returns '12d ago' for 12 days", () => {
      expect(formatAgo(NOW - 12 * DAY, NOW)).toBe("12d ago");
    });

    it("has no unit above days", () => {
      expect(formatAgo(NOW - 400 * DAY, NOW)).toBe("400d ago");
    });
  });

  describe("default current time", () => {
    it("reads the clock when nowS is undefined", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 30)).toBe("30s ago");
      expect(formatAgo(NOW - 30, undefined)).toBe("30s ago");
    });

    it("reads the clock when nowS is null", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 30, null as unknown as number)).toBe("30s ago");
    });

    it("rounds the clock down to a whole second", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000 + 999);
      // Unrounded, elapsed would be 59.999s; rounded down it is 59s.
      expect(formatAgo(NOW - 59)).toBe("59s ago");
      // Unrounded, elapsed would be 10.999s → "10.999s ago"; rounded it is 10s.
      expect(formatAgo(NOW - 10)).toBe("10s ago");
    });
  });
});
