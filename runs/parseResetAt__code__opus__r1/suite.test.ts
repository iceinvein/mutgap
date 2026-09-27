import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// parseResetAt works in local time, so fetchedAt is given without a zone
// suffix (parsed as local) to keep results independent of the machine's TZ.
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
    it.each(["Resets soon", "garbage", "Resets", "Resets 3", "Resets Foo 12 at noon"])(
      "returns undefined for %j",
      (text) => {
        expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
      },
    );
  });

  describe("compact durations", () => {
    it.each([
      ["Resets 2h", "2026-06-15T12:00:00"],
      ["Resets 45m", "2026-06-15T10:45:00"],
      ["Resets 1h30m", "2026-06-15T11:30:00"],
      ["Resets in 3h", "2026-06-15T13:00:00"],
      ["resets IN 2H15M", "2026-06-15T12:15:00"],
      ["2h", "2026-06-15T12:00:00"],
    ])("parses %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });
  });

  describe("verbose durations", () => {
    it.each([
      ["Resets in 1 hour", "2026-06-15T11:00:00"],
      ["Resets in 2 hours", "2026-06-15T12:00:00"],
      ["Resets in 3 hr", "2026-06-15T13:00:00"],
      ["Resets in 1 minute", "2026-06-15T10:01:00"],
      ["Resets in 30 minutes", "2026-06-15T10:30:00"],
      ["Resets in 5 min", "2026-06-15T10:05:00"],
      ["Resets in 2 hours 5 minutes", "2026-06-15T12:05:00"],
      ["Resets in 1hr 20min", "2026-06-15T11:20:00"],
    ])("parses %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });
  });

  it("rolls durations over into the next day", () => {
    expect(parseResetAt("Resets in 20h", FETCHED_AT)).toBe("2026-06-16T06:00:00");
  });

  it("ignores a trailing parenthesised timezone", () => {
    expect(parseResetAt("Resets in 2h (Australia/Perth)", FETCHED_AT)).toBe("2026-06-15T12:00:00");
    expect(parseResetAt("Resets 3pm (Europe/London)", FETCHED_AT)).toBe("2026-06-15T15:00:00");
    expect(parseResetAt("Resets Jun 20 at 9am (UTC)", FETCHED_AT)).toBe("2026-06-20T09:00:00");
  });

  describe("month/day with time", () => {
    it.each([
      ["Resets Jun 20 at 3pm", "2026-06-20T15:00:00"],
      ["Resets Jun 20 at 9am", "2026-06-20T09:00:00"],
      ["Resets Jun 20 at 9:30am", "2026-06-20T09:30:00"],
      ["Resets Jul 1 at 11:45pm", "2026-07-01T23:45:00"],
      ["Resets Jul 1 at 4:15 pm", "2026-07-01T16:15:00"],
      ["Resets Jun 20 at 12pm", "2026-06-20T12:00:00"],
      ["Resets Jun 20 at 12am", "2026-06-20T00:00:00"],
    ])("parses %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("uses the year of fetchedAt", () => {
      expect(parseResetAt("Resets Mar 3 at 8am", "2031-02-01T10:00:00")).toBe("2031-03-03T08:00:00");
    });

    // Bug: the year always comes from fetchedAt, so a date that has already
    // passed this year (i.e. next January, fetched in December) lands in the past.
    it.fails("rolls into next year when the month/day has already passed", () => {
      expect(parseResetAt("Resets Jan 2 at 3pm", "2026-12-30T10:00:00")).toBe("2027-01-02T15:00:00");
    });
  });

  describe("time only", () => {
    it.each([
      ["Resets 3pm", "2026-06-15T15:00:00"],
      ["Resets 11am", "2026-06-15T11:00:00"],
      ["Resets 4:30pm", "2026-06-15T16:30:00"],
      ["Resets 4:30 PM", "2026-06-15T16:30:00"],
      ["Resets 11:05am", "2026-06-15T11:05:00"],
    ])("parses %j as later today", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("moves a time that has already passed to tomorrow", () => {
      expect(parseResetAt("Resets 9am", FETCHED_AT)).toBe("2026-06-16T09:00:00");
    });

    it("keeps a time within the 15-minute grace period on today", () => {
      expect(parseResetAt("Resets 9:45am", FETCHED_AT)).toBe("2026-06-15T09:45:00");
    });

    it("moves a time just outside the grace period to tomorrow", () => {
      expect(parseResetAt("Resets 9:44am", FETCHED_AT)).toBe("2026-06-16T09:44:00");
    });

    it("keeps a time exactly equal to fetchedAt on today", () => {
      expect(parseResetAt("Resets 10am", FETCHED_AT)).toBe("2026-06-15T10:00:00");
    });

    it("rolls over month boundaries", () => {
      expect(parseResetAt("Resets 8am", "2026-06-30T20:00:00")).toBe("2026-07-01T08:00:00");
    });

    // Bug: 12pm is treated as hour 24 (midnight tonight) and 12am as hour 12
    // (noon) because the 12 o'clock hour isn't special-cased.
    it.fails("parses 12pm as noon", () => {
      expect(parseResetAt("Resets 12pm", FETCHED_AT)).toBe("2026-06-15T12:00:00");
    });

    it.fails("parses 12am as midnight", () => {
      expect(parseResetAt("Resets 12am", FETCHED_AT)).toBe("2026-06-16T00:00:00");
    });
  });
});
