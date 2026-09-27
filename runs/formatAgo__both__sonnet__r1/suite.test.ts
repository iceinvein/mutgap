import { describe, expect, it, vi, afterEach } from "vitest";
import { formatAgo } from "./formatAgo";

describe("formatAgo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an en dash when unixS is null", () => {
    expect(formatAgo(null, 1000)).toBe("–");
  });

  it("returns an en dash when unixS is undefined", () => {
    expect(formatAgo(undefined, 1000)).toBe("–");
  });

  it("treats a future timestamp as zero seconds elapsed", () => {
    expect(formatAgo(1000, 900)).toBe("just now");
  });

  it("returns 'just now' for zero seconds elapsed", () => {
    expect(formatAgo(1000, 1000)).toBe("just now");
  });

  it("returns 'just now' for up to 4 seconds elapsed", () => {
    expect(formatAgo(1000, 1004)).toBe("just now");
  });

  it("returns seconds at the 5 second boundary", () => {
    expect(formatAgo(1000, 1005)).toBe("5s ago");
  });

  it("returns seconds for values between 5 and 59", () => {
    expect(formatAgo(1000, 1030)).toBe("30s ago");
  });

  it("returns seconds at the 59 second boundary", () => {
    expect(formatAgo(1000, 1059)).toBe("59s ago");
  });

  it("switches to whole minutes at 60 seconds", () => {
    expect(formatAgo(1000, 1060)).toBe("1m ago");
  });

  it("rounds minutes down", () => {
    expect(formatAgo(1000, 1000 + 90)).toBe("1m ago");
  });

  it("returns minutes for values between 1m and 59m", () => {
    expect(formatAgo(1000, 1000 + 30 * 60)).toBe("30m ago");
  });

  it("returns minutes at the 59 minute boundary", () => {
    expect(formatAgo(1000, 1000 + 59 * 60)).toBe("59m ago");
  });

  it("switches to whole hours at 60 minutes", () => {
    expect(formatAgo(1000, 1000 + 60 * 60)).toBe("1h ago");
  });

  it("rounds hours down", () => {
    expect(formatAgo(1000, 1000 + 60 * 60 + 59 * 60)).toBe("1h ago");
  });

  it("returns hours for values between 1h and 23h", () => {
    expect(formatAgo(1000, 1000 + 12 * 3600)).toBe("12h ago");
  });

  it("returns hours at the 23 hour boundary", () => {
    expect(formatAgo(1000, 1000 + 23 * 3600)).toBe("23h ago");
  });

  it("switches to whole days at 24 hours", () => {
    expect(formatAgo(1000, 1000 + 24 * 3600)).toBe("1d ago");
  });

  it("rounds days down", () => {
    expect(formatAgo(1000, 1000 + 24 * 3600 + 23 * 3600)).toBe("1d ago");
  });

  it("returns days with no upper unit for large values", () => {
    expect(formatAgo(1000, 1000 + 400 * 86400)).toBe("400d ago");
  });

  it("reads the current time from the clock, rounded down, when nowS is omitted", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000 * 1000 + 500);
    expect(formatAgo(1000 - 30)).toBe("30s ago");
  });

  it("treats an omitted nowS the same as an undefined nowS", () => {
    vi.spyOn(Date, "now").mockReturnValue(2000 * 1000);
    expect(formatAgo(2000 - 10, undefined)).toBe("10s ago");
  });
});
