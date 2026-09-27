import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt values have no zone suffix, so they are parsed as local time and
// the expected outputs hold in any time zone. Dates avoid DST transitions.
const FETCHED_AT = "2026-06-15T14:00:37";

describe("parseResetAt", () => {
  describe("empty and unrecognised input", () => {
    it("returns undefined for undefined", () => {
      expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for an empty string", () => {
      expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
    });

    it.each([
      "Resets soon",
      "Resets (Europe/London)",
      "tomorrow",
      "Mar 12 at noon",
      "Resets 2h 30m",
      "in 2h 30m",
      "5 m",
      "15:00",
    ])("returns undefined for %j", (text) => {
      expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
    });
  });

  describe("cleaning", () => {
    it("strips a leading Resets case-insensitively", () => {
      expect(parseResetAt("RESETS in 1h", FETCHED_AT)).toBe("2026-06-15T15:00:37");
      expect(parseResetAt("resets 1h", FETCHED_AT)).toBe("2026-06-15T15:00:37");
    });

    it("strips a trailing parenthesised group", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", FETCHED_AT)).toBe("2026-06-15T15:00:00");
      expect(parseResetAt("Resets in 2h30m (UTC)", FETCHED_AT)).toBe("2026-06-15T16:30:37");
    });

    it("trims surrounding whitespace", () => {
      expect(parseResetAt("Resets   45m  ", FETCHED_AT)).toBe("2026-06-15T14:45:37");
      expect(parseResetAt("Resets 3pm (Europe/London)  ", FETCHED_AT)).toBe("2026-06-15T15:00:00");
    });

    it("only strips Resets at the very start", () => {
      expect(parseResetAt("  Resets 45m", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("durations", () => {
    it.each([
      ["2h", "2026-06-15T16:00:37"],
      ["45m", "2026-06-15T14:45:37"],
      ["2h30m", "2026-06-15T16:30:37"],
      ["2H30M", "2026-06-15T16:30:37"],
      ["in 2h30m", "2026-06-15T16:30:37"],
      ["In 45m", "2026-06-15T14:45:37"],
    ])("adds compact duration %j to fetchedAt, keeping seconds", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it.each([
      ["3 hours", "2026-06-15T17:00:37"],
      ["1 hour", "2026-06-15T15:00:37"],
      ["1 hr 5 min", "2026-06-15T15:05:37"],
      ["1hr5min", "2026-06-15T15:05:37"],
      ["2hours30minutes", "2026-06-15T16:30:37"],
      ["10 minutes", "2026-06-15T14:10:37"],
      ["1 minute", "2026-06-15T14:01:37"],
      ["in 3 HOURS", "2026-06-15T17:00:37"],
    ])("adds verbose duration %j to fetchedAt, keeping seconds", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("rolls over midnight and month boundaries", () => {
      expect(parseResetAt("in 2h30m", "2026-06-30T23:00:05")).toBe("2026-07-01T01:30:05");
    });

    it("pads single-digit fields in the output", () => {
      expect(parseResetAt("5m", "2026-01-02T03:04:05")).toBe("2026-01-02T03:09:05");
    });
  });

  describe("month, day and time", () => {
    it.each([
      ["Mar 12 at 9:30am", "2026-03-12T09:30:00"],
      ["Mar 12 at 3pm", "2026-03-12T15:00:00"],
      ["Mar 12 at 15:00", "2026-03-12T15:00:00"],
      ["Resets Mar 12 at 3pm (Europe/London)", "2026-03-12T15:00:00"],
    ])("parses %j in the year of fetchedAt with seconds zero", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("does not roll over into the next year", () => {
      expect(parseResetAt("Jan 2 at 3pm", "2026-12-30T10:00:00")).toBe("2026-01-02T15:00:00");
    });
  });

  describe("bare 12-hour time", () => {
    it.each([
      ["3pm", "2026-06-15T15:00:00"],
      ["9:30pm", "2026-06-15T21:30:00"],
      ["9:30 pm", "2026-06-15T21:30:00"],
      ["9 : 30 PM", "2026-06-15T21:30:00"],
    ])("places %j on the fetchedAt date with seconds zero", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("moves a time more than 15 minutes in the past to the next day", () => {
      expect(parseResetAt("9:30am", FETCHED_AT)).toBe("2026-06-16T09:30:00");
    });

    it("keeps a time exactly 15 minutes in the past on the same day", () => {
      expect(parseResetAt("3pm", "2026-06-15T15:15:00")).toBe("2026-06-15T15:00:00");
    });

    it("moves a time just over 15 minutes in the past to the next day", () => {
      expect(parseResetAt("3pm", "2026-06-15T15:15:01")).toBe("2026-06-16T15:00:00");
    });

    it("rolls over the month when moving to the next day", () => {
      expect(parseResetAt("9am", "2026-06-30T12:00:00")).toBe("2026-07-01T09:00:00");
    });

    it("treats 12am as midnight", () => {
      expect(parseResetAt("12am", FETCHED_AT)).toBe("2026-06-16T00:00:00");
      expect(parseResetAt("12:30am", "2026-06-15T00:10:00")).toBe("2026-06-15T00:30:00");
    });

    it("treats 12pm as noon", () => {
      expect(parseResetAt("12pm", "2026-06-15T09:00:00")).toBe("2026-06-15T12:00:00");
      expect(parseResetAt("12:45pm", "2026-06-15T09:00:00")).toBe("2026-06-15T12:45:00");
    });
  });
});
