import { describe, expect, it } from "vitest";
import { parseResetAt } from "./parseResetAt";

const fetchedAt = "2024-01-15T10:00:00";

describe("parseResetAt", () => {
  it("returns undefined when resetText is undefined", () => {
    expect(parseResetAt(undefined, fetchedAt)).toBeUndefined();
  });

  it("returns undefined when resetText is empty", () => {
    expect(parseResetAt("", fetchedAt)).toBeUndefined();
  });

  it("returns undefined for unrecognized text", () => {
    expect(parseResetAt("garbage input", fetchedAt)).toBeUndefined();
  });

  describe("compact durations (e.g. 2h30m)", () => {
    it("parses hours and minutes", () => {
      expect(parseResetAt("2h30m", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("parses minutes only", () => {
      expect(parseResetAt("30m", fetchedAt)).toBe("2024-01-15T10:30:00");
    });

    it("parses hours only", () => {
      expect(parseResetAt("2h", fetchedAt)).toBe("2024-01-15T12:00:00");
    });

    it("parses a zero duration as the fetch time itself", () => {
      expect(parseResetAt("0m", fetchedAt)).toBe("2024-01-15T10:00:00");
    });

    it("strips a leading 'Resets' prefix", () => {
      expect(parseResetAt("Resets in 2h30m", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("strips a leading 'in' after the 'Resets' prefix", () => {
      expect(parseResetAt("in 2h30m", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("strips a trailing parenthetical", () => {
      expect(parseResetAt("Resets in 2h30m (UTC)", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("is case-insensitive", () => {
      expect(parseResetAt("RESETS IN 2H30M", fetchedAt)).toBe("2024-01-15T12:30:00");
    });
  });

  describe("verbose durations (e.g. 2 hr 30 min)", () => {
    it("parses 'hr'/'min' abbreviations", () => {
      expect(parseResetAt("2 hr 30 min", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("parses 'hours'/'minutes' words", () => {
      expect(parseResetAt("2 hours 30 minutes", fetchedAt)).toBe("2024-01-15T12:30:00");
    });

    it("parses minutes only", () => {
      expect(parseResetAt("30 min", fetchedAt)).toBe("2024-01-15T10:30:00");
    });
  });

  describe("month/day with time (e.g. Jan 5 at 3:00pm)", () => {
    it("parses a 12-hour time with minutes", () => {
      expect(parseResetAt("Jan 5 at 3:00pm", fetchedAt)).toBe("2024-01-05T15:00:00");
    });

    it("parses an hour-only time", () => {
      expect(parseResetAt("Jan 5 at 3pm", fetchedAt)).toBe("2024-01-05T15:00:00");
    });

    it("parses a time with a space before am/pm", () => {
      expect(parseResetAt("Jan 5 at 3:00 pm", fetchedAt)).toBe("2024-01-05T15:00:00");
    });

    it("strips the 'Resets' prefix", () => {
      expect(parseResetAt("Resets Jan 5 at 3:00pm", fetchedAt)).toBe("2024-01-05T15:00:00");
    });

    it("returns undefined for an invalid month name", () => {
      expect(parseResetAt("Foo 5 at 3pm", fetchedAt)).toBeUndefined();
    });
  });

  describe("time only (e.g. 3:00pm)", () => {
    it("parses a time with minutes on the same day when still upcoming", () => {
      expect(parseResetAt("3:00pm", fetchedAt)).toBe("2024-01-15T15:00:00");
    });

    it("parses an hour-only time", () => {
      expect(parseResetAt("3pm", fetchedAt)).toBe("2024-01-15T15:00:00");
    });

    it("parses a time with a space before am/pm", () => {
      expect(parseResetAt("3:00 pm", fetchedAt)).toBe("2024-01-15T15:00:00");
    });

    it("strips a trailing timezone parenthetical", () => {
      expect(parseResetAt("Resets 3:00pm (America/New_York)", fetchedAt)).toBe("2024-01-15T15:00:00");
    });

    it("rolls over to the next day when the time is well in the past", () => {
      expect(parseResetAt("9am", fetchedAt)).toBe("2024-01-16T09:00:00");
    });

    it("keeps the same day when the time is within the grace period", () => {
      expect(parseResetAt("9:46am", fetchedAt)).toBe("2024-01-15T09:46:00");
    });

    it("keeps the same day exactly at the grace period boundary", () => {
      expect(parseResetAt("9:45am", fetchedAt)).toBe("2024-01-15T09:45:00");
    });
  });
});
