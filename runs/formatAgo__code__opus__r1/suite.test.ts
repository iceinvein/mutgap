import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAgo } from "./formatAgo";

const NOW = 1_700_000_000;
const ago = (seconds: number) => formatAgo(NOW - seconds, NOW);

describe("formatAgo", () => {
  describe("missing input", () => {
    it("returns an en dash for null", () => {
      expect(formatAgo(null, NOW)).toBe("–");
    });

    it("returns an en dash for undefined", () => {
      expect(formatAgo(undefined, NOW)).toBe("–");
    });

    it("treats 0 as a real timestamp, not missing", () => {
      expect(formatAgo(0, 86_400)).toBe("1d ago");
    });
  });

  describe("just now", () => {
    it.each([0, 1, 5])("returns 'just now' for %ds", (s) => {
      expect(ago(s)).toBe("just now");
    });

    it("clamps future timestamps to 'just now'", () => {
      expect(ago(-1)).toBe("just now");
      expect(ago(-10_000)).toBe("just now");
    });
  });

  describe("seconds", () => {
    it.each([
      [6, "6s ago"],
      [30, "30s ago"],
      [59, "59s ago"],
    ])("%ds -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("minutes", () => {
    it.each([
      [60, "1m ago"],
      [119, "1m ago"],
      [120, "2m ago"],
      [3599, "59m ago"],
    ])("%ds -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("hours", () => {
    it.each([
      [3600, "1h ago"],
      [7199, "1h ago"],
      [7200, "2h ago"],
      [86_399, "23h ago"],
    ])("%ds -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("days", () => {
    it.each([
      [86_400, "1d ago"],
      [172_799, "1d ago"],
      [172_800, "2d ago"],
      [86_400 * 365, "365d ago"],
    ])("%ds -> %s", (s, expected) => {
      expect(ago(s)).toBe(expected);
    });
  });

  describe("default now", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses the current time when nowS is omitted", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW * 1000);
      expect(formatAgo(NOW - 90)).toBe("1m ago");
    });

    it("floors the current time to whole seconds", () => {
      vi.useFakeTimers();
      // 999ms past NOW should still count as NOW, so 5s ago stays "just now"
      vi.setSystemTime(NOW * 1000 + 999);
      expect(formatAgo(NOW - 5)).toBe("just now");
    });
  });
});
