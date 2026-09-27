import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it("returns undefined for undefined candidate", () => {
      expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
    });

    it("returns undefined for empty candidate", () => {
      expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
    });
  });

  describe("basic agreement", () => {
    it("agrees on same note and mode", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
    });

    it("disagrees on different note", () => {
      expect(keyScaleAgreement("A minor", "B", "minor")).toBe(false);
    });

    it("disagrees on different mode", () => {
      expect(keyScaleAgreement("A minor", "A", "major")).toBe(false);
      expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
    });

    it("does not treat relative major/minor as agreeing", () => {
      expect(keyScaleAgreement("A minor", "C", "major")).toBe(false);
    });

    it("parses notes embedded in surrounding text", () => {
      expect(keyScaleAgreement("Key: Db major", "Db", "major")).toBe(true);
      expect(keyScaleAgreement("Detected key is F# minor", "F#", "minor")).toBe(true);
    });
  });

  describe("normalisation", () => {
    it("is case-insensitive", () => {
      expect(keyScaleAgreement("a MINOR", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("DB Major", "db", "MAJOR")).toBe(true);
    });

    it("reads ♭ as b", () => {
      expect(keyScaleAgreement("E♭ major", "Eb", "major")).toBe(true);
      expect(keyScaleAgreement("Bb minor", "B♭", "minor")).toBe(true);
    });
  });

  describe("enharmonic equivalence", () => {
    it.each([
      ["C#", "Db"],
      ["D#", "Eb"],
      ["F#", "Gb"],
      ["G#", "Ab"],
      ["A#", "Bb"],
    ])("treats %s and %s as the same pitch", (sharp, flat) => {
      expect(keyScaleAgreement(`${sharp} major`, flat, "major")).toBe(true);
      expect(keyScaleAgreement(`${flat} minor`, sharp, "minor")).toBe(true);
    });

    it("distinguishes a sharp/flat from its natural", () => {
      expect(keyScaleAgreement("C# major", "C", "major")).toBe(false);
      expect(keyScaleAgreement("Bb major", "B", "major")).toBe(false);
    });
  });

  describe("all recognised notes", () => {
    it.each([
      "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#",
      "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
    ])("recognises %s", (note) => {
      expect(keyScaleAgreement(`${note} major`, note, "major")).toBe(true);
    });
  });

  describe("unrecognised spellings", () => {
    it.each(["Cb", "Fb", "E#", "B#"])("treats %s as unparseable", (note) => {
      expect(keyScaleAgreement(`${note} major`, "C", "major")).toBeUndefined();
      expect(keyScaleAgreement("C major", note, "major")).toBeUndefined();
    });
  });

  describe("note parsing", () => {
    it("requires the note to begin a word", () => {
      // "xA" does not begin a word, so no note is found.
      expect(keyScaleAgreement("xA minor", "A", "minor")).toBeUndefined();
    });

    it("requires the note to be followed by whitespace or end of text", () => {
      // "Amin" is not followed by whitespace; no standalone note present.
      expect(keyScaleAgreement("Aminor", "A", "minor")).toBeUndefined();
      expect(keyScaleAgreement("minor, A", "A", "minor")).toBe(true);
    });

    it("uses the first qualifying note", () => {
      expect(keyScaleAgreement("G or D major", "G", "major")).toBe(true);
      expect(keyScaleAgreement("G or D major", "D", "major")).toBe(false);
    });

    it("skips words that start with A-G but are not notes", () => {
      expect(keyScaleAgreement("Detected: E minor", "E", "minor")).toBe(true);
      expect(keyScaleAgreement("Best guess Ab major", "Ab", "major")).toBe(true);
    });

    it("returns undefined when there is no note at all", () => {
      expect(keyScaleAgreement("minor", "A", "minor")).toBeUndefined();
      expect(keyScaleAgreement("A minor", "", "minor")).toBeUndefined();
      expect(keyScaleAgreement("H minor", "A", "minor")).toBeUndefined();
    });
  });

  describe("mode parsing", () => {
    it("prefers minor when both minor and major appear", () => {
      expect(keyScaleAgreement("A major minor", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("A major or minor", "A", "major")).toBe(false);
    });

    it("requires minor/major as whole words", () => {
      expect(keyScaleAgreement("A minority major", "A", "major")).toBe(true);
      expect(keyScaleAgreement("A majorly minor", "A", "minor")).toBe(true);
    });

    it("returns undefined when the candidate has no mode", () => {
      expect(keyScaleAgreement("A", "A", "major")).toBeUndefined();
      expect(keyScaleAgreement("A minorish", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no mode", () => {
      expect(keyScaleAgreement("A major", "A", "")).toBeUndefined();
      expect(keyScaleAgreement("A major", "A", "dorian")).toBeUndefined();
    });
  });
});
