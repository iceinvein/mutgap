import { describe, it, expect, vi, afterEach } from "vitest";
import { formatAgo } from "./formatAgo";

describe("formatAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an en dash when unixS is null", () => {
    expect(formatAgo(null)).toBe("–");
  });

  it("returns an en dash when unixS is undefined", () => {
    expect(formatAgo(undefined)).toBe("–");
  });

  it("treats a future timestamp as zero seconds elapsed", () => {
    expect(formatAgo(1000, 900)).toBe("just now");
  });

  it("returns 'just now' for zero seconds elapsed", () => {
    expect(formatAgo(1000, 1000)).toBe("just now");
  });

  it("returns 'just now' for 4 seconds elapsed", () => {
    expect(formatAgo(1000, 1004)).toBe("just now");
  });

  it("returns 'just now' at the 5 second boundary", () => {
    expect(formatAgo(1000, 1005)).toBe("just now");
  });

  it("returns seconds just past the 'just now' boundary", () => {
    expect(formatAgo(1000, 1006)).toBe("6s ago");
  });

  it("returns seconds up to 59", () => {
    expect(formatAgo(1000, 1059)).toBe("59s ago");
  });

  it("returns minutes at the 60 second boundary", () => {
    expect(formatAgo(1000, 1060)).toBe("1m ago");
  });

  it("rounds down whole minutes", () => {
    expect(formatAgo(1000, 1119)).toBe("1m ago");
  });

  it("returns minutes up to 59", () => {
    expect(formatAgo(0, 59 * 60)).toBe("59m ago");
  });

  it("returns hours at the 60 minute boundary", () => {
    expect(formatAgo(0, 60 * 60)).toBe("1h ago");
  });

  it("rounds down whole hours", () => {
    expect(formatAgo(0, 60 * 60 + 59 * 60)).toBe("1h ago");
  });

  it("returns hours up to 23", () => {
    expect(formatAgo(0, 23 * 60 * 60)).toBe("23h ago");
  });

  it("returns days at the 24 hour boundary", () => {
    expect(formatAgo(0, 24 * 60 * 60)).toBe("1d ago");
  });

  it("rounds down whole days", () => {
    expect(formatAgo(0, 24 * 60 * 60 + 23 * 60 * 60)).toBe("1d ago");
  });

  it("has no upper unit and keeps counting days", () => {
    expect(formatAgo(0, 12 * 24 * 60 * 60)).toBe("12d ago");
  });

  it("reads the current time from the clock when nowS is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000 * 1000));
    expect(formatAgo(999_998)).toBe("just now");
  });

  it("rounds the clock-read current time down to a whole second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000_500));
    expect(formatAgo(1_000_000)).toBe("just now");
  });
});
