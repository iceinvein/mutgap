import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("returns an em dash for null", () => {
    expect(formatDuration(null)).toBe("–");
  });

  it("returns an em dash for undefined", () => {
    expect(formatDuration(undefined)).toBe("–");
  });

  it("formats sub-second durations in milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats durations under 10s with one decimal place", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(9999)).toBe("10.0s");
    expect(formatDuration(10000)).toBe("10.0s");
  });

  it("formats durations from 10s up to 60s rounded to the nearest second", () => {
    expect(formatDuration(10001)).toBe("10s");
    expect(formatDuration(45400)).toBe("45s");
    expect(formatDuration(45600)).toBe("46s");
    expect(formatDuration(59999)).toBe("60s");
  });

  it("formats durations of a minute or more as minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(125000)).toBe("2m 5s");
  });

  it("rounds seconds within the minutes format", () => {
    expect(formatDuration(119600)).toBe("1m 60s");
    expect(formatDuration(600000)).toBe("10m 0s");
  });
});
