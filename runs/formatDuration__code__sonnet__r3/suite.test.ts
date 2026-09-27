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

  it("formats durations at or below 10s with one decimal place", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(10000)).toBe("10.0s");
  });

  it("formats durations above 10s and below 60s as rounded whole seconds", () => {
    expect(formatDuration(10001)).toBe("10s");
    expect(formatDuration(25000)).toBe("25s");
    expect(formatDuration(45499)).toBe("45s");
    expect(formatDuration(45500)).toBe("46s");
  });

  it("formats durations of 60s and above as minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(61000)).toBe("1m 1s");
    expect(formatDuration(125000)).toBe("2m 5s");
  });

  it("rounds seconds within the minutes branch", () => {
    expect(formatDuration(119500)).toBe("1m 60s");
  });
});
