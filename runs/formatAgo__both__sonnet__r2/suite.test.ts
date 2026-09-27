import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatAgo } from "./formatAgo";

describe("formatAgo", () => {
  it("returns an en dash for null", () => {
    expect(formatAgo(null)).toBe("–");
  });

  it("returns an en dash for undefined", () => {
    expect(formatAgo(undefined)).toBe("–");
  });

  it("treats a future timestamp as zero seconds elapsed", () => {
    expect(formatAgo(1_100, 1_000)).toBe("just now");
  });

  it("returns 'just now' for zero seconds elapsed", () => {
    expect(formatAgo(1_000, 1_000)).toBe("just now");
  });

  it("returns 'just now' for less than 5 seconds elapsed", () => {
    expect(formatAgo(1_000, 1_004)).toBe("just now");
  });

  it("returns the seconds for exactly 5 seconds elapsed", () => {
    expect(formatAgo(1_000, 1_005)).toBe("5s ago");
  });

  it("returns the seconds for 59 seconds elapsed", () => {
    expect(formatAgo(1_000, 1_059)).toBe("59s ago");
  });

  it("returns whole minutes for exactly 60 seconds elapsed", () => {
    expect(formatAgo(1_000, 1_060)).toBe("1m ago");
  });

  it("rounds down to whole minutes", () => {
    expect(formatAgo(0, 119)).toBe("1m ago");
  });

  it("returns 59 minutes just before the hour boundary", () => {
    expect(formatAgo(0, 59 * 60 + 59)).toBe("59m ago");
  });

  it("returns whole hours for exactly 60 minutes elapsed", () => {
    expect(formatAgo(0, 60 * 60)).toBe("1h ago");
  });

  it("rounds down to whole hours", () => {
    expect(formatAgo(0, 2 * 60 * 60 + 59 * 60)).toBe("2h ago");
  });

  it("returns 23 hours just before the day boundary", () => {
    expect(formatAgo(0, 23 * 60 * 60 + 59 * 60 + 59)).toBe("23h ago");
  });

  it("returns whole days for exactly 24 hours elapsed", () => {
    expect(formatAgo(0, 24 * 60 * 60)).toBe("1d ago");
  });

  it("rounds down to whole days with no upper unit", () => {
    expect(formatAgo(0, 12 * 24 * 60 * 60 + 60 * 60)).toBe("12d ago");
  });

  describe("when nowS is omitted", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("reads the current time from the clock, rounded down to a whole second", () => {
      vi.setSystemTime(1_000_500);
      expect(formatAgo(1_000 - 5)).toBe("5s ago");
    });

    it("treats null nowS the same as omitted", () => {
      vi.setSystemTime(1_005_000);
      expect(formatAgo(1_000, null as unknown as undefined)).toBe("5s ago");
    });
  });
});
