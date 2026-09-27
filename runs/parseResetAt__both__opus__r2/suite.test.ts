import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

// fetchedAt values have no zone suffix so they are read as local time, keeping
// the expected results independent of the machine's time zone. Dates are chosen
// away from DST transitions.
const FETCHED_AT = "2026-06-10T14:00:30";

describe("parseResetAt", () => {
  describe("empty and unrecognised input", () => {
    it("returns undefined for undefined text", () => {
      expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
    });

    it("returns undefined for empty text", () => {
      expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
    });

    it.each(["tomorrow", "Resets soon", "Resets", "3", "Mar 12", "2h 30m", "Resets 2h 30m"])(
      "returns undefined for %j",
      (text) => {
        expect(parseResetAt(text, FETCHED_AT)).toBeUndefined();
      },
    );
  });

  describe("cleaning", () => {
    it("strips a leading Resets case-insensitively", () => {
      expect(parseResetAt("Resets 2h", FETCHED_AT)).toBe("2026-06-10T16:00:30");
      expect(parseResetAt("resets 2h", FETCHED_AT)).toBe("2026-06-10T16:00:30");
      expect(parseResetAt("RESETS 2h", FETCHED_AT)).toBe("2026-06-10T16:00:30");
    });

    it("strips a trailing parenthesised group", () => {
      expect(parseResetAt("Resets 3pm (Europe/London)", FETCHED_AT)).toBe("2026-06-10T15:00:00");
      expect(parseResetAt("Resets in 45m (UTC)", FETCHED_AT)).toBe("2026-06-10T14:45:30");
    });

    it("trims surrounding whitespace", () => {
      expect(parseResetAt("Resets in 2h  ", FETCHED_AT)).toBe("2026-06-10T16:00:30");
    });
  });

  describe("durations", () => {
    it.each([
      ["2h", "2026-06-10T16:00:30"],
      ["45m", "2026-06-10T14:45:30"],
      ["2h30m", "2026-06-10T16:30:30"],
      ["in 2h30m", "2026-06-10T16:30:30"],
      ["Resets in 2h30m", "2026-06-10T16:30:30"],
      ["2H30M", "2026-06-10T16:30:30"],
      ["IN 45M", "2026-06-10T14:45:30"],
    ])("parses compact duration %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it.each([
      ["3 hours", "2026-06-10T17:00:30"],
      ["1 hour", "2026-06-10T15:00:30"],
      ["1 hr", "2026-06-10T15:00:30"],
      ["5 min", "2026-06-10T14:05:30"],
      ["1 minute", "2026-06-10T14:01:30"],
      ["20 minutes", "2026-06-10T14:20:30"],
      ["1 hr 5 min", "2026-06-10T15:05:30"],
      ["1hr5min", "2026-06-10T15:05:30"],
      ["2 hours 30 minutes", "2026-06-10T16:30:30"],
      ["in 3 hours", "2026-06-10T17:00:30"],
      ["3 HOURS", "2026-06-10T17:00:30"],
      ["1 Hr 5 Min", "2026-06-10T15:05:30"],
    ])("parses verbose duration %j", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("keeps the seconds of fetchedAt", () => {
      expect(parseResetAt("in 1h", "2026-06-10T14:00:59")).toBe("2026-06-10T15:00:59");
    });

    it("rolls over into the next day, month and year", () => {
      expect(parseResetAt("in 2h", "2026-06-10T23:30:00")).toBe("2026-06-11T01:30:00");
      expect(parseResetAt("in 2h", "2026-06-30T23:30:00")).toBe("2026-07-01T01:30:00");
      expect(parseResetAt("in 45m", "2026-12-31T23:30:00")).toBe("2027-01-01T00:15:00");
    });

    it("handles minute counts above 59", () => {
      expect(parseResetAt("90m", FETCHED_AT)).toBe("2026-06-10T15:30:30");
    });

    it("accepts an ISO fetchedAt with a zone suffix", () => {
      const fetchedAt = "2026-06-10T12:00:00.000Z";
      const expected = new Date(Date.parse(fetchedAt) + 150 * 60_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local =
        `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}` +
        `T${pad(expected.getHours())}:${pad(expected.getMinutes())}:${pad(expected.getSeconds())}`;
      expect(parseResetAt("in 2h30m", fetchedAt)).toBe(local);
    });
  });

  describe("month, day and time", () => {
    it.each([
      ["Mar 12 at 9:30am", "2026-03-12T09:30:00"],
      ["Mar 12 at 3pm", "2026-03-12T15:00:00"],
      ["Mar 12 at 15:00", "2026-03-12T15:00:00"],
      ["Resets Mar 12 at 3pm (Europe/London)", "2026-03-12T15:00:00"],
      ["Jul 4 at 9:05pm", "2026-07-04T21:05:00"],
    ])("parses %j in the year of fetchedAt", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("sets seconds to zero", () => {
      expect(parseResetAt("Jun 12 at 3pm", "2026-06-10T14:00:59")).toBe("2026-06-12T15:00:00");
    });

    it("does not roll over into the next year when the date has passed", () => {
      expect(parseResetAt("Jan 1 at 1am", "2026-12-31T23:00:00")).toBe("2026-01-01T01:00:00");
    });
  });

  describe("bare 12-hour time", () => {
    it.each([
      ["3pm", "2026-06-10T15:00:00"],
      ["9:30pm", "2026-06-10T21:30:00"],
      ["9:30 pm", "2026-06-10T21:30:00"],
      [" 9 : 30 pm ", "2026-06-10T21:30:00"],
      ["3PM", "2026-06-10T15:00:00"],
      ["Resets 3pm (Europe/London)", "2026-06-10T15:00:00"],
    ])("places %j on the date of fetchedAt with seconds zero", (text, expected) => {
      expect(parseResetAt(text, FETCHED_AT)).toBe(expected);
    });

    it("treats 12am as midnight", () => {
      expect(parseResetAt("12am", "2026-06-10T23:00:00")).toBe("2026-06-11T00:00:00");
      expect(parseResetAt("12:30am", "2026-06-10T00:10:00")).toBe("2026-06-10T00:30:00");
    });

    it("treats 12pm as noon", () => {
      expect(parseResetAt("12pm", "2026-06-10T09:00:00")).toBe("2026-06-10T12:00:00");
      expect(parseResetAt("12:30pm", "2026-06-10T09:00:00")).toBe("2026-06-10T12:30:00");
    });

    it("moves a time more than 15 minutes in the past to the next day", () => {
      expect(parseResetAt("9:30am", FETCHED_AT)).toBe("2026-06-11T09:30:00");
      expect(parseResetAt("3pm", "2026-06-10T15:15:01")).toBe("2026-06-11T15:00:00");
    });

    it("keeps a time up to 15 minutes in the past on the same day", () => {
      expect(parseResetAt("3pm", "2026-06-10T15:14:59")).toBe("2026-06-10T15:00:00");
      expect(parseResetAt("3pm", "2026-06-10T15:15:00")).toBe("2026-06-10T15:00:00");
    });

    it("keeps a time exactly at fetchedAt on the same day", () => {
      expect(parseResetAt("3pm", "2026-06-10T15:00:00")).toBe("2026-06-10T15:00:00");
    });

    it("rolls over into the next month and year", () => {
      expect(parseResetAt("1am", "2026-06-30T23:00:00")).toBe("2026-07-01T01:00:00");
      expect(parseResetAt("1am", "2026-12-31T23:00:00")).toBe("2027-01-01T01:00:00");
    });
  });
});
