import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt strings deliberately omit a zone suffix so `new Date(...)` parses
// them as local time, matching the local-time output of parseResetAt.

describe("parseResetAt", () => {
  describe("invalid input", () => {
    it("returns undefined for undefined resetText", () => {
      expect(parseResetAt(undefined, "2024-03-12T10:00:00")).toBeUndefined();
    });

    it("returns undefined for empty resetText", () => {
      expect(parseResetAt("", "2024-03-12T10:00:00")).toBeUndefined();
    });

    it("returns undefined when the text matches none of the known forms", () => {
      expect(parseResetAt("not a reset time", "2024-03-12T10:00:00")).toBeUndefined();
    });

    it("returns undefined for a mixed duration form like '2h 30m'", () => {
      expect(parseResetAt("2h 30m", "2024-03-12T10:15:30")).toBeUndefined();
      expect(parseResetAt("Resets in 2h 30m", "2024-03-12T10:15:30")).toBeUndefined();
    });
  });

  describe("cleaning", () => {
    const fetchedAt = "2024-03-12T09:00:00";

    it("strips a leading 'Resets' followed by whitespace", () => {
      expect(parseResetAt("Resets 3pm", fetchedAt)).toBe("2024-03-12T15:00:00");
    });

    it("strips 'Resets' case-insensitively", () => {
      expect(parseResetAt("resets 3pm", fetchedAt)).toBe("2024-03-12T15:00:00");
      expect(parseResetAt("RESETS 3pm", fetchedAt)).toBe("2024-03-12T15:00:00");
    });

    it("strips a trailing parenthesised zone group", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", fetchedAt)).toBe("2024-03-12T15:00:00");
    });
  });

  describe("durations", () => {
    const fetchedAt = "2024-03-12T10:15:30";

    it("adds a compact hours+minutes duration, keeping fetchedAt's seconds", () => {
      expect(parseResetAt("2h30m", fetchedAt)).toBe("2024-03-12T12:45:30");
    });

    it("accepts an optional leading 'in '", () => {
      expect(parseResetAt("in 2h30m", fetchedAt)).toBe("2024-03-12T12:45:30");
    });

    it("is case-insensitive, including the 'in' prefix", () => {
      expect(parseResetAt("IN 2H30M", fetchedAt)).toBe("2024-03-12T12:45:30");
    });

    it("accepts compact minutes only", () => {
      expect(parseResetAt("45m", fetchedAt)).toBe("2024-03-12T11:00:30");
    });

    it("accepts compact hours only", () => {
      expect(parseResetAt("2h", fetchedAt)).toBe("2024-03-12T12:15:30");
    });

    it("accepts a verbose hours duration", () => {
      expect(parseResetAt("3 hours", fetchedAt)).toBe("2024-03-12T13:15:30");
    });

    it("accepts verbose units case-insensitively", () => {
      expect(parseResetAt("3 HOURS", fetchedAt)).toBe("2024-03-12T13:15:30");
    });

    it("accepts a verbose hours+minutes duration with spaces", () => {
      expect(parseResetAt("1 hr 5 min", fetchedAt)).toBe("2024-03-12T11:20:30");
    });

    it("accepts a verbose hours+minutes duration without spaces", () => {
      expect(parseResetAt("1hr5min", fetchedAt)).toBe("2024-03-12T11:20:30");
    });
  });

  describe("month and day with 'at' a time", () => {
    it("parses a 12-hour time with minutes", () => {
      expect(parseResetAt("Mar 12 at 9:30am", "2024-01-05T08:00:00")).toBe("2024-03-12T09:30:00");
    });

    it("parses a 12-hour time on the hour", () => {
      expect(parseResetAt("Mar 12 at 3pm", "2024-01-05T08:00:00")).toBe("2024-03-12T15:00:00");
    });

    it("parses a 24-hour time", () => {
      expect(parseResetAt("Mar 12 at 15:00", "2024-01-05T08:00:00")).toBe("2024-03-12T15:00:00");
    });

    it("uses the year of fetchedAt with no rollover into the next year", () => {
      expect(parseResetAt("Mar 12 at 3pm", "2024-12-20T08:00:00")).toBe("2024-03-12T15:00:00");
    });
  });

  describe("bare 12-hour time", () => {
    it("places a future time on fetchedAt's local date", () => {
      expect(parseResetAt("3pm", "2024-03-12T10:00:00")).toBe("2024-03-12T15:00:00");
    });

    it("rolls over to the next day when more than 15 minutes in the past", () => {
      expect(parseResetAt("9:30am", "2024-03-12T10:00:00")).toBe("2024-03-13T09:30:00");
    });

    it("ignores whitespace between the time and meridiem", () => {
      expect(parseResetAt("9:30 am", "2024-03-12T10:00:00")).toBe("2024-03-13T09:30:00");
    });

    it("stays on the same day when exactly 15 minutes in the past", () => {
      expect(parseResetAt("10:00am", "2024-03-12T10:15:00")).toBe("2024-03-12T10:00:00");
    });

    it("rolls over when just over 15 minutes in the past", () => {
      expect(parseResetAt("10:00am", "2024-03-12T10:15:01")).toBe("2024-03-13T10:00:00");
    });

    it("treats 12am as midnight", () => {
      expect(parseResetAt("12am", "2024-03-12T00:05:00")).toBe("2024-03-12T00:00:00");
    });

    it("treats 12pm as noon", () => {
      expect(parseResetAt("12pm", "2024-03-12T11:00:00")).toBe("2024-03-12T12:00:00");
    });
  });
});
