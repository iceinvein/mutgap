import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

describe("parseResetAt", () => {
  describe("invalid input", () => {
    it("returns undefined when resetText is undefined", () => {
      expect(parseResetAt(undefined, "2024-01-01T10:00:00")).toBeUndefined();
    });

    it("returns undefined when resetText is empty", () => {
      expect(parseResetAt("", "2024-01-01T10:00:00")).toBeUndefined();
    });

    it("returns undefined when resetText matches none of the known forms", () => {
      expect(parseResetAt("Resets whenever", "2024-01-01T10:00:00")).toBeUndefined();
    });

    it("returns undefined for a mixed duration form like '2h 30m'", () => {
      expect(parseResetAt("Resets in 2h 30m", "2024-01-01T10:00:00")).toBeUndefined();
    });
  });

  describe("cleaning", () => {
    it("strips a leading 'Resets' case-insensitively", () => {
      expect(parseResetAt("resets 3pm", "2024-01-01T10:00:00")).toBe("2024-01-01T15:00:00");
    });

    it("strips a trailing parenthesised zone", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", "2024-01-01T10:00:00")).toBe(
        "2024-01-01T15:00:00",
      );
    });
  });

  describe("durations", () => {
    it("parses a compact hours+minutes duration and keeps fetchedAt seconds", () => {
      expect(parseResetAt("Resets in 2h30m", "2024-01-01T10:15:30")).toBe("2024-01-01T12:45:30");
    });

    it("parses a compact hours-only duration", () => {
      expect(parseResetAt("Resets in 2h", "2024-01-01T10:15:30")).toBe("2024-01-01T12:15:30");
    });

    it("parses a compact minutes-only duration", () => {
      expect(parseResetAt("Resets in 45m", "2024-01-01T10:15:30")).toBe("2024-01-01T11:00:30");
    });

    it("parses a duration without a leading 'in'", () => {
      expect(parseResetAt("Resets 2h30m", "2024-01-01T10:15:30")).toBe("2024-01-01T12:45:30");
    });

    it("is case-insensitive for compact duration units", () => {
      expect(parseResetAt("Resets in 2H30M", "2024-01-01T10:15:30")).toBe("2024-01-01T12:45:30");
    });

    it("parses a verbose duration with 'hours' and 'min'", () => {
      expect(parseResetAt("Resets in 3 hours", "2024-01-01T10:15:30")).toBe("2024-01-01T13:15:30");
    });

    it("parses a verbose duration combining hr and min", () => {
      expect(parseResetAt("Resets in 1 hr 5 min", "2024-01-01T10:15:30")).toBe(
        "2024-01-01T11:20:30",
      );
    });

    it("parses a verbose duration with singular 'minute'", () => {
      expect(parseResetAt("Resets in 1 minute", "2024-01-01T10:15:30")).toBe("2024-01-01T10:16:30");
    });

    it("parses a verbose duration with singular 'hour'", () => {
      expect(parseResetAt("Resets in 1 hour", "2024-01-01T10:15:30")).toBe("2024-01-01T11:15:30");
    });

    it("parses a verbose duration with no spaces", () => {
      expect(parseResetAt("Resets in 1hr5min", "2024-01-01T10:15:30")).toBe("2024-01-01T11:20:30");
    });
  });

  describe("month and day", () => {
    it("parses a 12-hour time with minutes", () => {
      expect(parseResetAt("Resets Mar 12 at 9:30am", "2024-01-01T10:00:00")).toBe(
        "2024-03-12T09:30:00",
      );
    });

    it("parses a bare 12-hour hour with pm", () => {
      expect(parseResetAt("Resets Mar 12 at 3pm", "2024-01-01T10:00:00")).toBe(
        "2024-03-12T15:00:00",
      );
    });

    it("parses a 24-hour time", () => {
      expect(parseResetAt("Resets Mar 12 at 15:00", "2024-01-01T10:00:00")).toBe(
        "2024-03-12T15:00:00",
      );
    });

    it("uses the year of fetchedAt with no rollover, even if the date is in the past", () => {
      expect(parseResetAt("Resets Jan 1 at 9:00", "2024-12-31T10:00:00")).toBe(
        "2024-01-01T09:00:00",
      );
    });
  });

  describe("bare 12-hour time", () => {
    it("places the time on the local date of fetchedAt when later the same day", () => {
      expect(parseResetAt("Resets 3pm", "2024-01-01T10:00:00")).toBe("2024-01-01T15:00:00");
    });

    it("parses a time with minutes", () => {
      expect(parseResetAt("Resets 9:30am", "2024-01-01T05:00:00")).toBe("2024-01-01T09:30:00");
    });

    it("ignores whitespace between the time and meridiem", () => {
      expect(parseResetAt("Resets 9:30 am", "2024-01-01T05:00:00")).toBe("2024-01-01T09:30:00");
    });

    it("treats 12am as midnight", () => {
      expect(parseResetAt("Resets 12am", "2024-01-01T00:00:00")).toBe("2024-01-01T00:00:00");
    });

    it("treats 12pm as noon", () => {
      expect(parseResetAt("Resets 12pm", "2024-01-01T00:00:00")).toBe("2024-01-01T12:00:00");
    });

    it("stays on the same day when up to 15 minutes in the past", () => {
      expect(parseResetAt("Resets 10:00am", "2024-01-01T10:15:00")).toBe("2024-01-01T10:00:00");
    });

    it("moves to the next day when more than 15 minutes in the past", () => {
      expect(parseResetAt("Resets 10:00am", "2024-01-01T10:15:01")).toBe("2024-01-02T10:00:00");
    });
  });
});
