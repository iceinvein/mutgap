import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAgo } from "./formatAgo";

const NOW = 1_700_000_000;

describe("formatAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a dash for null or undefined", () => {
    expect(formatAgo(null, NOW)).toBe("–");
    expect(formatAgo(undefined, NOW)).toBe("–");
  });

  it("treats 0 as a valid timestamp, not missing", () => {
    expect(formatAgo(0, 86_400)).toBe("1d ago");
  });

  it("returns 'just now' for 0 to 5 seconds", () => {
    expect(formatAgo(NOW, NOW)).toBe("just now");
    expect(formatAgo(NOW - 5, NOW)).toBe("just now");
  });

  it("clamps future timestamps to 'just now'", () => {
    expect(formatAgo(NOW + 1000, NOW)).toBe("just now");
  });

  it("formats seconds from 6 to 59", () => {
    expect(formatAgo(NOW - 6, NOW)).toBe("6s ago");
    expect(formatAgo(NOW - 59, NOW)).toBe("59s ago");
  });

  it("formats minutes, flooring partial minutes", () => {
    expect(formatAgo(NOW - 60, NOW)).toBe("1m ago");
    expect(formatAgo(NOW - 119, NOW)).toBe("1m ago");
    expect(formatAgo(NOW - 59 * 60 - 59, NOW)).toBe("59m ago");
  });

  it("formats hours, flooring partial hours", () => {
    expect(formatAgo(NOW - 3600, NOW)).toBe("1h ago");
    expect(formatAgo(NOW - 2 * 3600 + 1, NOW)).toBe("1h ago");
    expect(formatAgo(NOW - 24 * 3600 + 1, NOW)).toBe("23h ago");
  });

  it("formats days, flooring partial days", () => {
    expect(formatAgo(NOW - 86_400, NOW)).toBe("1d ago");
    expect(formatAgo(NOW - 2 * 86_400 + 1, NOW)).toBe("1d ago");
    expect(formatAgo(NOW - 365 * 86_400, NOW)).toBe("365d ago");
  });

  it("uses the current time when nowS is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW * 1000 + 999);
    expect(formatAgo(NOW - 90)).toBe("1m ago");
    expect(formatAgo(NOW)).toBe("just now");
  });

  it("treats nowS = 0 as provided, not missing", () => {
    expect(formatAgo(-120, 0)).toBe("2m ago");
  });
});
