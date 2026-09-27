import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt values have no zone suffix, so they are parsed as local time and the
// expectations hold in any time zone. Dates avoid DST transitions.
const FETCHED_AT = "2026-06-10T14:20:45";

describe("parseResetAt", () => {
  describe("empty and unrecognised input", () => {
    it("returns undefined for undefined", () => {
      expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for an empty string", () => {
      expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
    });

    it.each(["soon", "Resets tomorrow", "3", "25:00", "in", "Resets", "2h 30m", "2 h 30 m"])(
      "returns undefined for %j",
      (text) => {
        expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
      },
    );
  });

  describe("cleaning", () => {
    it("strips a leading 'Resets' case-insensitively", () => {
      expect(parseResetAt("Resets 2h", FETCHED_AT)).toBe("2026-06-10T16:20:45");
      expect(parseResetAt("RESETS 2h", FETCHED_AT)).toBe("2026-06-10T16:20:45");
      expect(parseResetAt("resets   2h", FETCHED_AT)).toBe("2026-06-10T16:20:45");
    });

    it("does not strip 'Resets' without following whitespace", () => {
      expect(parseResetAt("Resets2h", FETCHED_AT)).toBeUndefined();
    });

    it("strips a trailing parenthesised group", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", FETCHED_AT)).toBe("2026-06-10T15:00:00");
      expect(parseResetAt("Resets in 2h30m (America/New_York)", FETCHED_AT)).toBe("2026-06-10T16:50:45");
    });

    it("trims surrounding whitespace", () => {
      expect(parseResetAt("Resets 3pm  ", FETCHED_AT)).toBe("2026-06-10T15:00:00");
      expect(parseResetAt("  2h  ", FETCHED_AT)).toBe("2026-06-10T16:20:45");
    });
  });

  describe("durations", () => {
    it.each([
      ["2h", "2026-06-10T16:20:45"],
      ["45m", "2026-06-10T15:05:45"],
      ["2h30m", "2026-06-10T16:50:45"],
      ["2H30M", "2026-06-10T16:50:45"],
      ["0h5m", "2026-06-10T14:25:45"],
    ])("adds compact duration %j to fetchedAt, keeping seconds", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it.each([
      ["3 hours", "2026-06-10T17:20:45"],
      ["1 hour", "2026-06-10T15:20:45"],
      ["1 hr", "2026-06-10T15:20:45"],
      ["1hr", "2026-06-10T15:20:45"],
      ["5 min", "2026-06-10T14:25:45"],
      ["1 minute", "2026-06-10T14:21:45"],
      ["30 minutes", "2026-06-10T14:50:45"],
      ["1 hr 5 min", "2026-06-10T15:25:45"],
      ["1hr5min", "2026-06-10T15:25:45"],
      ["2 Hours 10 Minutes", "2026-06-10T16:30:45"],
    ])("adds verbose duration %j to fetchedAt", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("accepts an optional 'in ' prefix", () => {
      expect(parseResetAt("in 2h30m", FETCHED_AT)).toBe("2026-06-10T16:50:45");
      expect(parseResetAt("Resets in 3 hours", FETCHED_AT)).toBe("2026-06-10T17:20:45");
      expect(parseResetAt("IN 45m", FETCHED_AT)).toBe("2026-06-10T15:05:45");
    });

    it("rolls over into the next day", () => {
      expect(parseResetAt("in 10h", FETCHED_AT)).toBe("2026-06-11T00:20:45");
    });

    it("rolls over into the next year", () => {
      expect(parseResetAt("in 2h", "2026-12-31T23:30:15")).toBe("2027-01-01T01:30:15");
    });

    it("rejects minutes before hours in compact form", () => {
      expect(parseResetAt("30m2h", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("month, day and time", () => {
    it.each([
      ["Mar 12 at 9:30am", "2026-03-12T09:30:00"],
      ["Mar 12 at 3pm", "2026-03-12T15:00:00"],
      ["Mar 12 at 15:00", "2026-03-12T15:00:00"],
      ["Resets Aug 1 at 11:45pm (Europe/London)", "2026-08-01T23:45:00"],
    ])("parses %j in the year of fetchedAt", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("does not roll over into the next year for dates already past", () => {
      expect(parseResetAt("Jan 2 at 9am", "2026-12-30T10:00:00")).toBe("2026-01-02T09:00:00");
    });

    it("uses seconds zero", () => {
      expect(parseResetAt("Jun 10 at 3pm", FETCHED_AT)).toBe("2026-06-10T15:00:00");
    });
  });

  describe("bare 12-hour time", () => {
    it.each([
      ["3pm", "2026-06-10T15:00:00"],
      ["3PM", "2026-06-10T15:00:00"],
      ["9:30pm", "2026-06-10T21:30:00"],
      ["9:30 pm", "2026-06-10T21:30:00"],
      [" 9 : 30 p m ", "2026-06-10T21:30:00"],
      ["11:59pm", "2026-06-10T23:59:00"],
    ])("places %j on the date of fetchedAt with seconds zero", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("moves a time more than 15 minutes in the past to the next day", () => {
      expect(parseResetAt("9:30am", FETCHED_AT)).toBe("2026-06-11T09:30:00");
      expect(parseResetAt("2pm", FETCHED_AT)).toBe("2026-06-11T14:00:00");
    });

    it("keeps a time up to 15 minutes in the past on the same day", () => {
      expect(parseResetAt("2:10pm", FETCHED_AT)).toBe("2026-06-10T14:10:00");
      expect(parseResetAt("2pm", "2026-06-10T14:15:00")).toBe("2026-06-10T14:00:00");
    });

    it("moves a time just over 15 minutes in the past to the next day", () => {
      expect(parseResetAt("2pm", "2026-06-10T14:15:01")).toBe("2026-06-11T14:00:00");
    });

    it("rolls over month and year when moving to the next day", () => {
      expect(parseResetAt("9am", "2026-12-31T10:00:00")).toBe("2027-01-01T09:00:00");
    });

    it("treats 12am as midnight", () => {
      expect(parseResetAt("12am", "2026-06-10T00:05:00")).toBe("2026-06-10T00:00:00");
      expect(parseResetAt("12:30am", FETCHED_AT)).toBe("2026-06-11T00:30:00");
    });

    it("treats 12pm as noon", () => {
      expect(parseResetAt("12pm", "2026-06-10T09:00:00")).toBe("2026-06-10T12:00:00");
      expect(parseResetAt("12:30pm", "2026-06-10T09:00:00")).toBe("2026-06-10T12:30:00");
    });

    it("rejects a time without am/pm", () => {
      expect(parseResetAt("3", FETCHED_AT)).toBeUndefined();
      expect(parseResetAt("15:00", FETCHED_AT)).toBeUndefined();
    });
  });
});
