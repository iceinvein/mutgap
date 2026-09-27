import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt values have no offset, so they parse as local time and the
// assertions hold regardless of the machine's time zone.
const FETCHED_AT = "2026-09-26T10:00:00";

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
    it.each(["garbage", "Resets soon", "Foo 1 at 3pm", "tomorrow"])(
      "returns undefined for %j",
      (text) => {
        expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
      },
    );
  });

  describe("compact durations", () => {
    it.each([
      ["2h30m", "2026-09-26T12:30:00"],
      ["3h", "2026-09-26T13:00:00"],
      ["45m", "2026-09-26T10:45:00"],
      ["in 2h30m", "2026-09-26T12:30:00"],
      ["Resets in 1h5m", "2026-09-26T11:05:00"],
      ["RESETS IN 1H", "2026-09-26T11:00:00"],
    ])("parses %j relative to fetchedAt", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("rolls over into the next day", () => {
      expect(parseResetAt("in 3h", "2026-09-26T23:00:00")).toBe("2026-09-27T02:00:00");
    });

    it.fails("accepts a space between hours and minutes (known bug)", () => {
      expect(parseResetAt("Resets in 2h 30m", FETCHED_AT)).toBe("2026-09-26T12:30:00");
    });
  });

  describe("verbose durations", () => {
    it.each([
      ["in 1 hr 5 min", "2026-09-26T11:05:00"],
      ["2 hours", "2026-09-26T12:00:00"],
      ["1 hour", "2026-09-26T11:00:00"],
      ["30 minutes", "2026-09-26T10:30:00"],
      ["1 minute", "2026-09-26T10:01:00"],
      ["Resets in 4 hours 15 minutes", "2026-09-26T14:15:00"],
    ])("parses %j relative to fetchedAt", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });
  });

  describe("month/day with time", () => {
    it.each([
      ["Oct 1 at 3pm", "2026-10-01T15:00:00"],
      ["Resets Oct 1 at 3:30pm", "2026-10-01T15:30:00"],
      ["Oct 1 at 3:30 PM", "2026-10-01T15:30:00"],
      ["Oct 1 at 15:00", "2026-10-01T15:00:00"],
      ["Oct 12 at 9am (Australia/Perth)", "2026-10-12T09:00:00"],
    ])("parses %j using the fetchedAt year", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it.fails("uses the next year when the date has already passed (known bug)", () => {
      expect(parseResetAt("Jan 2 at 3pm", "2026-12-30T10:00:00")).toBe("2027-01-02T15:00:00");
    });
  });

  describe("time only", () => {
    it.each([
      ["3pm", "2026-09-26T15:00:00"],
      ["Resets 3pm", "2026-09-26T15:00:00"],
      ["3:30 PM", "2026-09-26T15:30:00"],
      ["11am", "2026-09-26T11:00:00"],
      ["Resets 3pm (Australia/Perth)", "2026-09-26T15:00:00"],
    ])("parses %j as later the same day", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("keeps today when the time is within the 15 minute grace period", () => {
      expect(parseResetAt("9:50am", FETCHED_AT)).toBe("2026-09-26T09:50:00");
    });

    it("keeps today at exactly 15 minutes in the past", () => {
      expect(parseResetAt("9:45am", FETCHED_AT)).toBe("2026-09-26T09:45:00");
    });

    it("moves to tomorrow when the time is more than 15 minutes in the past", () => {
      expect(parseResetAt("9:40am", FETCHED_AT)).toBe("2026-09-27T09:40:00");
    });

    it("moves across a month boundary", () => {
      expect(parseResetAt("1am", "2026-09-30T22:00:00")).toBe("2026-10-01T01:00:00");
    });

    it("returns undefined for a time without am/pm", () => {
      expect(parseResetAt("15:00", FETCHED_AT)).toBeUndefined();
    });

    it.fails("treats 12pm as noon (known bug)", () => {
      expect(parseResetAt("12pm", FETCHED_AT)).toBe("2026-09-26T12:00:00");
    });

    it.fails("treats 12am as midnight (known bug)", () => {
      expect(parseResetAt("12am", FETCHED_AT)).toBe("2026-09-27T00:00:00");
    });
  });
});
