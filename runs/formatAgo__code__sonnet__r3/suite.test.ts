import { describe, it, expect } from "vitest";
import { formatAgo } from "./formatAgo";

describe("formatAgo", () => {
  it("returns the en dash for null", () => {
    expect(formatAgo(null)).toBe("–");
  });

  it("returns the en dash for undefined", () => {
    expect(formatAgo(undefined)).toBe("–");
  });

  it("returns 'just now' for 0 seconds ago", () => {
    expect(formatAgo(100, 100)).toBe("just now");
  });

  it("returns 'just now' at the 5 second boundary", () => {
    expect(formatAgo(95, 100)).toBe("just now");
  });

  it("clamps future timestamps to 'just now'", () => {
    expect(formatAgo(150, 100)).toBe("just now");
  });

  it("returns seconds just past the 'just now' boundary", () => {
    expect(formatAgo(94, 100)).toBe("6s ago");
  });

  it("returns seconds just below the minute boundary", () => {
    expect(formatAgo(41, 100)).toBe("59s ago");
  });

  it("returns minutes at the minute boundary", () => {
    expect(formatAgo(40, 100)).toBe("1m ago");
  });

  it("returns minutes just below the hour boundary", () => {
    const now = 100000;
    expect(formatAgo(now - 59 * 60, now)).toBe("59m ago");
  });

  it("returns hours at the hour boundary", () => {
    const now = 100000;
    expect(formatAgo(now - 60 * 60, now)).toBe("1h ago");
  });

  it("returns hours just below the day boundary", () => {
    const now = 1000000;
    expect(formatAgo(now - 23 * 3600, now)).toBe("23h ago");
  });

  it("returns days at the day boundary", () => {
    const now = 1000000;
    expect(formatAgo(now - 24 * 3600, now)).toBe("1d ago");
  });

  it("returns multiple days", () => {
    const now = 1000000;
    expect(formatAgo(now - 5 * 24 * 3600, now)).toBe("5d ago");
  });

  it("uses the current time when nowS is not provided", () => {
    const nowS = Math.floor(Date.now() / 1000);
    expect(formatAgo(nowS)).toBe("just now");
  });
});
