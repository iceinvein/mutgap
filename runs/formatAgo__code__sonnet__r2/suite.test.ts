import { describe, expect, it } from "vitest";
import { formatAgo } from "./formatAgo";

describe("formatAgo", () => {
  it("returns – for null", () => {
    expect(formatAgo(null)).toBe("–");
  });

  it("returns – for undefined", () => {
    expect(formatAgo(undefined)).toBe("–");
  });

  it("returns 'just now' for 0 seconds", () => {
    expect(formatAgo(1000, 1000)).toBe("just now");
  });

  it("returns 'just now' at the 5 second boundary", () => {
    expect(formatAgo(1000, 1005)).toBe("just now");
  });

  it("returns seconds just past the 'just now' boundary", () => {
    expect(formatAgo(1000, 1006)).toBe("6s ago");
  });

  it("returns seconds ago under a minute", () => {
    expect(formatAgo(1000, 1059)).toBe("59s ago");
  });

  it("returns minutes ago at the 60 second boundary", () => {
    expect(formatAgo(1000, 1060)).toBe("1m ago");
  });

  it("returns minutes ago under an hour", () => {
    expect(formatAgo(1000, 1000 + 59 * 60)).toBe("59m ago");
  });

  it("returns hours ago at the 60 minute boundary", () => {
    expect(formatAgo(1000, 1000 + 60 * 60)).toBe("1h ago");
  });

  it("returns hours ago under a day", () => {
    expect(formatAgo(1000, 1000 + 23 * 60 * 60)).toBe("23h ago");
  });

  it("returns days ago at the 24 hour boundary", () => {
    expect(formatAgo(1000, 1000 + 24 * 60 * 60)).toBe("1d ago");
  });

  it("returns multiple days ago", () => {
    expect(formatAgo(1000, 1000 + 5 * 24 * 60 * 60)).toBe("5d ago");
  });

  it("clamps negative deltas (future timestamp) to 'just now'", () => {
    expect(formatAgo(2000, 1000)).toBe("just now");
  });

  it("uses Date.now() when nowS is omitted", () => {
    const nowS = Math.floor(Date.now() / 1000);
    expect(formatAgo(nowS)).toBe("just now");
  });
});
