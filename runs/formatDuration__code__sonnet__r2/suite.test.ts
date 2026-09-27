import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("returns an em dash for null or undefined", () => {
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(undefined)).toBe("–");
  });

  it("formats sub-second durations in milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats durations up to 10s with one decimal place", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(10000)).toBe("10.0s");
  });

  it("formats durations between 10s and 60s as rounded whole seconds", () => {
    expect(formatDuration(10001)).toBe("10s");
    expect(formatDuration(15400)).toBe("15s");
    expect(formatDuration(45600)).toBe("46s");
  });

  it("formats minute-scale durations as minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(125000)).toBe("2m 5s");
    expect(formatDuration(3600000)).toBe("60m 0s");
  });
});
