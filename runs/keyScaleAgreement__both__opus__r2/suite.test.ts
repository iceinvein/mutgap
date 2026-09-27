import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it("returns undefined for an undefined candidate", () => {
      expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
    });

    it("returns undefined for an empty candidate", () => {
      expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
    });
  });

  describe("agreement", () => {
    it("returns true for an identical key and mode", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
    });

    it("accepts surrounding text in the candidate", () => {
      expect(keyScaleAgreement("Key: Db major", "Db", "major")).toBe(true);
      expect(keyScaleAgreement("Detected key is F# minor.", "F#", "minor")).toBe(
        true,
      );
    });

    it("is case-insensitive on both sides", () => {
      expect(keyScaleAgreement("a MINOR", "A", "Minor")).toBe(true);
      expect(keyScaleAgreement("DB Major", "db", "MAJOR")).toBe(true);
    });

    it("reads ♭ as b", () => {
      expect(keyScaleAgreement("E♭ major", "Eb", "major")).toBe(true);
      expect(keyScaleAgreement("Eb major", "E♭", "major")).toBe(true);
    });

    it.each([
      ["C#", "Db"],
      ["D#", "Eb"],
      ["F#", "Gb"],
      ["G#", "Ab"],
      ["A#", "Bb"],
    ])("treats %s and %s as the same pitch", (sharp, flat) => {
      expect(keyScaleAgreement(`${sharp} minor`, flat, "minor")).toBe(true);
      expect(keyScaleAgreement(`${flat} major`, sharp, "major")).toBe(true);
    });

    it.each(["C", "D", "E", "F", "G", "A", "B"])(
      "recognises the natural note %s",
      (note) => {
        expect(keyScaleAgreement(`${note} major`, note, "major")).toBe(true);
      },
    );

    it("accepts the note at the end of the text", () => {
      expect(keyScaleAgreement("minor, in G", "G", "minor")).toBe(true);
    });
  });

  describe("disagreement", () => {
    it("returns false for a different pitch", () => {
      expect(keyScaleAgreement("A minor", "B", "minor")).toBe(false);
      expect(keyScaleAgreement("C# major", "C", "major")).toBe(false);
    });

    it("returns false for a different mode", () => {
      expect(keyScaleAgreement("A minor", "A", "major")).toBe(false);
      expect(keyScaleAgreement("A major", "A", "minor")).toBe(false);
    });

    it("does not treat relative major/minor keys as agreeing", () => {
      expect(keyScaleAgreement("A minor", "C", "major")).toBe(false);
    });
  });

  describe("mode parsing", () => {
    it("prefers minor when both minor and major appear", () => {
      expect(keyScaleAgreement("C major or minor", "C", "minor")).toBe(true);
      expect(keyScaleAgreement("C major or minor", "C", "major")).toBe(false);
    });

    it("returns undefined when the candidate has no mode", () => {
      expect(keyScaleAgreement("C", "C", "major")).toBeUndefined();
      expect(keyScaleAgreement("Key: C", "C", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no mode", () => {
      expect(keyScaleAgreement("C major", "C", "")).toBeUndefined();
      expect(keyScaleAgreement("C major", "C", "dorian")).toBeUndefined();
    });

    it("requires minor/major as whole words", () => {
      expect(keyScaleAgreement("C minorish", "C", "minor")).toBeUndefined();
      expect(keyScaleAgreement("C majority", "C", "major")).toBeUndefined();
      // "minorish" is not minor, but "major" still sets the mode
      expect(keyScaleAgreement("C minorish major", "C", "major")).toBe(true);
    });
  });

  describe("note parsing", () => {
    it("uses the first note-like word", () => {
      expect(keyScaleAgreement("G or A minor", "G", "minor")).toBe(true);
      expect(keyScaleAgreement("G or A minor", "A", "minor")).toBe(false);
    });

    it("ignores letters A-G that do not begin a word", () => {
      // the "a" in "Estimated" / "major" is not a note
      expect(keyScaleAgreement("Estimated: D major", "D", "major")).toBe(true);
    });

    it("ignores letters A-G not followed by whitespace or end of text", () => {
      // "Detected" and "Best" begin with D/B but continue with letters
      expect(keyScaleAgreement("Detected E minor", "E", "minor")).toBe(true);
      expect(keyScaleAgreement("Best guess: F major", "F", "major")).toBe(true);
    });

    it("returns undefined when the candidate has no note", () => {
      expect(keyScaleAgreement("minor", "A", "minor")).toBeUndefined();
      expect(keyScaleAgreement("H minor", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no note", () => {
      expect(keyScaleAgreement("A minor", "", "minor")).toBeUndefined();
      expect(keyScaleAgreement("A minor", "X", "minor")).toBeUndefined();
    });

    it.each(["Cb", "Fb", "E#", "B#"])(
      "does not recognise the spelling %s",
      (note) => {
        expect(keyScaleAgreement(`${note} major`, "C", "major")).toBeUndefined();
        expect(keyScaleAgreement("C major", note, "major")).toBeUndefined();
      },
    );
  });
});
