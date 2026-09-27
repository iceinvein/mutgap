import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt has no offset, so it is parsed as local time, and parseResetAt returns
// local time too. That keeps these tests independent of the machine's timezone.
// Mid-June avoids DST transitions in both hemispheres.
const FETCHED_AT = "2026-06-15T10:00:00";

describe("parseResetAt", () => {
  describe("empty input", () => {
    it("returns undefined for undefined", () => {
      expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for an empty string", () => {
      expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("unrecognised input", () => {
    it.each(["garbage", "Resets soon", "Resets tomorrow", "Resets 3", "in 5 days"])(
      "returns undefined for %j",
      (text) => {
        expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
      },
    );
  });

  describe("compact durations", () => {
    it.each([
      ["2h", "2026-06-15T12:00:00"],
      ["45m", "2026-06-15T10:45:00"],
      ["1h30m", "2026-06-15T11:30:00"],
      ["in 1h30m", "2026-06-15T11:30:00"],
      ["Resets in 3h", "2026-06-15T13:00:00"],
      ["RESETS IN 2H5M", "2026-06-15T12:05:00"],
    ])("parses %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("rolls over into the next day", () => {
      expect(parseResetAt("in 15h", FETCHED_AT)).toBe("2026-06-16T01:00:00");
    });

    it("returns fetchedAt for a zero duration", () => {
      expect(parseResetAt("0h0m", FETCHED_AT)).toBe("2026-06-15T10:00:00");
    });
  });

  describe("verbose durations", () => {
    it.each([
      ["in 1 hr", "2026-06-15T11:00:00"],
      ["in 1 hour", "2026-06-15T11:00:00"],
      ["in 2 hours", "2026-06-15T12:00:00"],
      ["in 5 min", "2026-06-15T10:05:00"],
      ["in 1 minute", "2026-06-15T10:01:00"],
      ["in 30 minutes", "2026-06-15T10:30:00"],
      ["in 1 hr 30 min", "2026-06-15T11:30:00"],
      ["Resets in 2 hours 15 minutes", "2026-06-15T12:15:00"],
    ])("parses %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });
  });

  describe("time of day", () => {
    it.each([
      ["Resets 3pm", "2026-06-15T15:00:00"],
      ["Resets 3:30pm", "2026-06-15T15:30:00"],
      ["Resets 11am", "2026-06-15T11:00:00"],
      ["Resets 3 PM", "2026-06-15T15:00:00"],
      ["Resets 3:30 pm", "2026-06-15T15:30:00"],
      ["3pm", "2026-06-15T15:00:00"],
    ])("parses %j as later today", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("strips a trailing parenthesised timezone", () => {
      expect(parseResetAt("Resets 3pm (Australia/Perth)", FETCHED_AT)).toBe("2026-06-15T15:00:00");
    });

    it("keeps a time within the 15-minute grace period on the same day", () => {
      expect(parseResetAt("Resets 9:45am", FETCHED_AT)).toBe("2026-06-15T09:45:00");
    });

    it("moves a time more than 15 minutes in the past to the next day", () => {
      expect(parseResetAt("Resets 9:44am", FETCHED_AT)).toBe("2026-06-16T09:44:00");
      expect(parseResetAt("Resets 8am", FETCHED_AT)).toBe("2026-06-16T08:00:00");
    });

    it("rolls over month boundaries", () => {
      expect(parseResetAt("Resets 8am", "2026-06-30T10:00:00")).toBe("2026-07-01T08:00:00");
    });

    // Known bug: "12pm" becomes hour 24, which is midnight the next day.
    it.fails("parses 12pm as noon", () => {
      expect(parseResetAt("Resets 12pm", FETCHED_AT)).toBe("2026-06-15T12:00:00");
    });

    // Known bug: "12am" is not mapped to hour 0, so it's treated as noon.
    it.fails("parses 12am as midnight", () => {
      expect(parseResetAt("Resets 12am", FETCHED_AT)).toBe("2026-06-16T00:00:00");
    });

    // Known bug: hours above 12 are accepted and pushed past midnight.
    it.fails("rejects an out-of-range hour", () => {
      expect(parseResetAt("Resets 13pm", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("month, day and time", () => {
    it.each([
      ["Resets Jun 20 at 3pm", "2026-06-20T15:00:00"],
      ["Resets Jun 20 at 3:30pm", "2026-06-20T15:30:00"],
      ["Resets Jun 20 at 3:30 pm", "2026-06-20T15:30:00"],
      ["Resets Jul 4 at 9am", "2026-07-04T09:00:00"],
      ["Resets Jun 20 at 12pm", "2026-06-20T12:00:00"],
      ["Resets Jun 20 at 3pm (UTC)", "2026-06-20T15:00:00"],
    ])("parses %j using the fetchedAt year", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("returns undefined when the time part is not parseable", () => {
      expect(parseResetAt("Resets Jun 20 at noonish", FETCHED_AT)).toBeUndefined();
    });

    // Known bug: always uses fetchedAt's year, so a date in the next year comes back in the past.
    it.fails("uses the next year when the date has already passed", () => {
      expect(parseResetAt("Resets Jan 2 at 3pm", "2026-12-30T10:00:00")).toBe("2027-01-02T15:00:00");
    });
  });
});
