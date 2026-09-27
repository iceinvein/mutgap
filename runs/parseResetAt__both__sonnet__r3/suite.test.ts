import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

function fmt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

const FETCHED_AT = "2024-06-15T10:20:30";
const FETCHED_DATE = new Date(FETCHED_AT);

describe("parseResetAt", () => {
  describe("invalid input", () => {
    it("returns undefined for undefined resetText", () => {
      expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for empty resetText", () => {
      expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for unrecognized text", () => {
      expect(parseResetAt("banana", FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for a mixed duration form with a space", () => {
      expect(parseResetAt("2h 30m", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("text cleaning", () => {
    it("strips a leading 'Resets' case-insensitively", () => {
      expect(parseResetAt("Resets 3pm", FETCHED_AT)).toBe(parseResetAt("3pm", FETCHED_AT));
      expect(parseResetAt("resets 3pm", FETCHED_AT)).toBe(parseResetAt("3pm", FETCHED_AT));
      expect(parseResetAt("RESETS 3pm", FETCHED_AT)).toBe(parseResetAt("3pm", FETCHED_AT));
    });

    it("strips a trailing parenthesised zone", () => {
      expect(parseResetAt("3pm (Europe/London)", FETCHED_AT)).toBe(parseResetAt("3pm", FETCHED_AT));
    });

    it("strips both a leading 'Resets' and a trailing zone together", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", FETCHED_AT)).toBe(parseResetAt("3pm", FETCHED_AT));
    });
  });

  describe("durations", () => {
    it("adds a compact hours-only duration", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + 2 * 60 * 60_000));
      expect(parseResetAt("2h", FETCHED_AT)).toBe(expected);
    });

    it("adds a compact minutes-only duration", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + 45 * 60_000));
      expect(parseResetAt("45m", FETCHED_AT)).toBe(expected);
    });

    it("adds a compact hours-and-minutes duration", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + (2 * 60 + 30) * 60_000));
      expect(parseResetAt("2h30m", FETCHED_AT)).toBe(expected);
    });

    it("accepts an optional leading 'in '", () => {
      expect(parseResetAt("in 2h30m", FETCHED_AT)).toBe(parseResetAt("2h30m", FETCHED_AT));
    });

    it("is case-insensitive for compact durations", () => {
      expect(parseResetAt("2H30M", FETCHED_AT)).toBe(parseResetAt("2h30m", FETCHED_AT));
    });

    it("keeps the seconds of fetchedAt", () => {
      const fetchedWithSeconds = "2024-06-15T10:20:45";
      const expected = fmt(new Date(new Date(fetchedWithSeconds).getTime() + 2 * 60 * 60_000));
      expect(expected.endsWith(":45")).toBe(true);
      expect(parseResetAt("2h", fetchedWithSeconds)).toBe(expected);
    });

    it("adds a verbose hours duration ('hours')", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + 3 * 60 * 60_000));
      expect(parseResetAt("3 hours", FETCHED_AT)).toBe(expected);
    });

    it("adds a verbose hours-and-minutes duration ('hr'/'min')", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + (1 * 60 + 5) * 60_000));
      expect(parseResetAt("1 hr 5 min", FETCHED_AT)).toBe(expected);
    });

    it("adds a verbose minutes-only duration ('minutes')", () => {
      const expected = fmt(new Date(FETCHED_DATE.getTime() + 5 * 60_000));
      expect(parseResetAt("5 minutes", FETCHED_AT)).toBe(expected);
    });

    it("allows verbose durations with no spaces", () => {
      expect(parseResetAt("1hr5min", FETCHED_AT)).toBe(parseResetAt("1 hr 5 min", FETCHED_AT));
    });

    it("is case-insensitive for verbose durations", () => {
      expect(parseResetAt("3 Hours", FETCHED_AT)).toBe(parseResetAt("3 hours", FETCHED_AT));
    });

    it("accepts an optional leading 'in ' for verbose durations", () => {
      expect(parseResetAt("in 3 hours", FETCHED_AT)).toBe(parseResetAt("3 hours", FETCHED_AT));
    });
  });

  describe("month and day with a time", () => {
    it("parses 'Mon D at H:MMam'", () => {
      const expected = fmt(new Date(`Mar 12 ${FETCHED_DATE.getFullYear()} 9:30 AM`));
      expect(parseResetAt("Mar 12 at 9:30am", FETCHED_AT)).toBe(expected);
    });

    it("parses 'Mon D at Hpm'", () => {
      const expected = fmt(new Date(`Mar 12 ${FETCHED_DATE.getFullYear()} 3:00 PM`));
      expect(parseResetAt("Mar 12 at 3pm", FETCHED_AT)).toBe(expected);
    });

    it("parses 'Mon D at HH:MM' 24-hour time", () => {
      const expected = fmt(new Date(`Mar 12 ${FETCHED_DATE.getFullYear()} 15:00`));
      expect(parseResetAt("Mar 12 at 15:00", FETCHED_AT)).toBe(expected);
    });

    it("uses the year of fetchedAt with no rollover, even if that date has passed", () => {
      const fetchedAt = "2024-12-20T10:00:00";
      const result = parseResetAt("Jan 5 at 9am", fetchedAt);
      expect(result).toBe("2024-01-05T09:00:00");
    });

    it("sets seconds to zero", () => {
      const result = parseResetAt("Mar 12 at 9:30am", FETCHED_AT)!;
      expect(result.endsWith(":00")).toBe(true);
    });
  });

  describe("bare 12-hour time", () => {
    it("places a future time on the same local day", () => {
      const expected = fmt(new Date(2024, 5, 15, 15, 0, 0));
      expect(parseResetAt("3pm", FETCHED_AT)).toBe(expected);
    });

    it("ignores all whitespace", () => {
      expect(parseResetAt("9:30 am", FETCHED_AT)).toBe(parseResetAt("9:30am", FETCHED_AT));
    });

    it("rolls a time more than 15 minutes in the past to the next day", () => {
      // fetchedAt 10:20:30, target 9:30:00 is 50m30s in the past
      const expected = fmt(new Date(2024, 5, 16, 9, 30, 0));
      expect(parseResetAt("9:30am", FETCHED_AT)).toBe(expected);
    });

    it("keeps a time up to 15 minutes in the past on the same day", () => {
      const fetchedAt = "2024-06-15T10:20:30";
      // 10:10:00 is 10m30s before fetchedAt, within the 15-minute grace period
      const expected = fmt(new Date(2024, 5, 15, 10, 10, 0));
      expect(parseResetAt("10:10am", fetchedAt)).toBe(expected);
    });

    it("keeps a time exactly 15 minutes in the past on the same day", () => {
      const fetchedAt = "2024-06-15T10:20:00";
      // 10:05:00 is exactly 15 minutes before fetchedAt
      const expected = fmt(new Date(2024, 5, 15, 10, 5, 0));
      expect(parseResetAt("10:05am", fetchedAt)).toBe(expected);
    });

    it("rolls a time just over 15 minutes in the past to the next day", () => {
      const fetchedAt = "2024-06-15T10:20:00";
      // 10:04:00 is 16 minutes before fetchedAt
      const expected = fmt(new Date(2024, 5, 16, 10, 4, 0));
      expect(parseResetAt("10:04am", fetchedAt)).toBe(expected);
    });

    it("sets seconds to zero", () => {
      const result = parseResetAt("3pm", FETCHED_AT)!;
      expect(result.endsWith(":00")).toBe(true);
    });

    it("treats 12am as midnight", () => {
      const fetchedAt = "2024-06-15T00:00:30";
      const expected = fmt(new Date(2024, 5, 15, 0, 0, 0));
      expect(parseResetAt("12am", fetchedAt)).toBe(expected);
    });

    it("treats 12pm as noon", () => {
      const fetchedAt = "2024-06-15T11:00:00";
      const expected = fmt(new Date(2024, 5, 15, 12, 0, 0));
      expect(parseResetAt("12pm", fetchedAt)).toBe(expected);
    });
  });
});
