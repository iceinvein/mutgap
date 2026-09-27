import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

function fetchedAt(year: number, month: number, day: number, hours: number, minutes: number, seconds = 0): string {
  return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
}

describe("parseResetAt", () => {
  it("returns undefined when resetText is undefined", () => {
    expect(parseResetAt(undefined, fetchedAt(2024, 1, 10, 9, 0))).toBeUndefined();
  });

  it("returns undefined when resetText is empty", () => {
    expect(parseResetAt("", fetchedAt(2024, 1, 10, 9, 0))).toBeUndefined();
  });

  it("returns undefined for unparseable text", () => {
    expect(parseResetAt("unknown format", fetchedAt(2024, 1, 10, 9, 0))).toBeUndefined();
  });

  describe("compact durations", () => {
    it("parses hours and minutes", () => {
      const result = parseResetAt("2h30m", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T11:30:00");
    });

    it("parses minutes only", () => {
      const result = parseResetAt("45m", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T09:45:00");
    });

    it("parses hours only", () => {
      const result = parseResetAt("3h", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T12:00:00");
    });

    it("strips a leading 'Resets' and 'in' prefix", () => {
      const result = parseResetAt("Resets in 2h30m", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T11:30:00");
    });

    it("strips a trailing parenthetical annotation", () => {
      const result = parseResetAt("Resets in 1h (approx)", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T10:00:00");
    });
  });

  describe("verbose durations", () => {
    it("parses hours and minutes", () => {
      const result = parseResetAt("2 hours 30 min", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T11:30:00");
    });

    it("parses hours only", () => {
      const result = parseResetAt("1 hr", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T10:00:00");
    });

    it("parses minutes only", () => {
      const result = parseResetAt("30 minutes", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T09:30:00");
    });
  });

  describe("month/day at time", () => {
    it("parses an hour:minute time", () => {
      const result = parseResetAt("Jan 5 at 3:30pm", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-05T15:30:00");
    });

    it("parses an hour-only time", () => {
      const result = parseResetAt("Jan 5 at 3pm", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-05T15:00:00");
    });

    it("strips a trailing parenthetical annotation", () => {
      const result = parseResetAt("Mar 2 at 9:15am (UTC)", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-03-02T09:15:00");
    });
  });

  describe("time only", () => {
    it("uses today's date when the time is still ahead", () => {
      const result = parseResetAt("3:30pm", fetchedAt(2024, 1, 10, 10, 0));
      expect(result).toBe("2024-01-10T15:30:00");
    });

    it("rolls over to tomorrow when the time is well past (beyond grace period)", () => {
      const result = parseResetAt("3:30pm", fetchedAt(2024, 1, 10, 16, 0));
      expect(result).toBe("2024-01-11T15:30:00");
    });

    it("stays on today's date when the time is only slightly past (within grace period)", () => {
      const result = parseResetAt("3:30pm", fetchedAt(2024, 1, 10, 15, 40));
      expect(result).toBe("2024-01-10T15:30:00");
    });

    it("parses an hour-only time defaulting minutes to zero", () => {
      const result = parseResetAt("5pm", fetchedAt(2024, 1, 10, 9, 0));
      expect(result).toBe("2024-01-10T17:00:00");
    });
  });
});
