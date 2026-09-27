import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

const FETCHED_AT = "2024-01-15T10:00:00";

describe("parseResetAt", () => {
  it("returns undefined when resetText is undefined", () => {
    expect(parseResetAt(undefined, FETCHED_AT)).toBeUndefined();
  });

  it("returns undefined when resetText is empty", () => {
    expect(parseResetAt("", FETCHED_AT)).toBeUndefined();
  });

  describe("compact durations", () => {
    it("parses hours and minutes", () => {
      expect(parseResetAt("in 2h30m", FETCHED_AT)).toBe("2024-01-15T12:30:00");
    });

    it("parses hours only", () => {
      expect(parseResetAt("in 3h", FETCHED_AT)).toBe("2024-01-15T13:00:00");
    });

    it("parses minutes only", () => {
      expect(parseResetAt("in 45m", FETCHED_AT)).toBe("2024-01-15T10:45:00");
    });

    it("strips a leading 'Resets' prefix case-insensitively", () => {
      expect(parseResetAt("Resets in 30m", FETCHED_AT)).toBe("2024-01-15T10:30:00");
    });

    it("strips a trailing parenthetical", () => {
      expect(parseResetAt("in 30m (approx)", FETCHED_AT)).toBe("2024-01-15T10:30:00");
    });
  });

  describe("verbose durations", () => {
    it("parses 'hours' and 'minutes' words", () => {
      expect(parseResetAt("in 2 hours 30 minutes", FETCHED_AT)).toBe("2024-01-15T12:30:00");
    });

    it("parses singular 'hour' and 'minute'", () => {
      expect(parseResetAt("in 1 hour 1 minute", FETCHED_AT)).toBe("2024-01-15T11:01:00");
    });

    it("parses 'hr'/'min' abbreviations", () => {
      expect(parseResetAt("in 2hr 30min", FETCHED_AT)).toBe("2024-01-15T12:30:00");
    });
  });

  describe("month/day formats", () => {
    it("parses 'Mon D at H:MMam/pm'", () => {
      expect(parseResetAt("Jan 20 at 3:30pm", FETCHED_AT)).toBe("2024-01-20T15:30:00");
    });

    it("parses 'Mon D at Hpm' without minutes", () => {
      expect(parseResetAt("Jan 20 at 3pm", FETCHED_AT)).toBe("2024-01-20T15:00:00");
    });

    it("returns undefined for an unparseable month name", () => {
      expect(parseResetAt("Xyz 20 at 3pm", FETCHED_AT)).toBeUndefined();
    });
  });

  describe("time-only formats", () => {
    it("keeps the same day when the time is still ahead", () => {
      expect(parseResetAt("11:30am", FETCHED_AT)).toBe("2024-01-15T11:30:00");
    });

    it("rolls over to the next day when the time has passed the grace window", () => {
      // fetchedAt is 10:00; 9:00am is more than 15 minutes in the past.
      expect(parseResetAt("9:00am", FETCHED_AT)).toBe("2024-01-16T09:00:00");
    });

    it("does not roll over within the grace window", () => {
      // fetchedAt is 10:00; 9:50am is within the 15 minute grace window.
      expect(parseResetAt("9:50am", FETCHED_AT)).toBe("2024-01-15T09:50:00");
    });

    it("parses hour-only time without minutes", () => {
      expect(parseResetAt("2pm", FETCHED_AT)).toBe("2024-01-15T14:00:00");
    });

    // Known bug: 12pm is treated as hour 24 (rolls to next day's midnight)
    // instead of noon. Expected behavior asserted here; currently fails.
    it("parses 12:00pm as noon", () => {
      expect(parseResetAt("12:00pm", FETCHED_AT)).toBe("2024-01-15T12:00:00");
    });

    // Known bug: 12am is treated as hour 12 (noon) instead of midnight.
    it("parses 12:00am as midnight", () => {
      expect(parseResetAt("12:00am", "2024-01-15T13:00:00")).toBe("2024-01-16T00:00:00");
    });
  });
});
