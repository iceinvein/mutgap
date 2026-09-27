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

  describe("matching", () => {
    it("returns true when pitch and mode match", () => {
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
    });

    it("returns false when the pitch differs", () => {
      expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
    });

    it("returns false when the mode differs", () => {
      expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
      expect(keyScaleAgreement("A major", "A", "minor")).toBe(false);
    });

    it("does not treat relative major/minor keys as agreeing", () => {
      expect(keyScaleAgreement("A minor", "C", "major")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(keyScaleAgreement("c MINOR", "C", "Minor")).toBe(true);
      expect(keyScaleAgreement("F# Major", "f#", "MAJOR")).toBe(true);
    });

    it("tolerates extra whitespace between note and mode", () => {
      expect(keyScaleAgreement("G    minor", "G", "minor")).toBe(true);
    });

    it("finds the note inside surrounding words", () => {
      expect(keyScaleAgreement("key of D minor", "D", "minor")).toBe(true);
    });
  });

  describe("accidentals", () => {
    it("parses sharps", () => {
      expect(keyScaleAgreement("C# minor", "C#", "minor")).toBe(true);
      expect(keyScaleAgreement("C# minor", "C", "minor")).toBe(false);
    });

    it("parses ASCII flats", () => {
      expect(keyScaleAgreement("Bb major", "Bb", "major")).toBe(true);
      expect(keyScaleAgreement("Bb major", "B", "major")).toBe(false);
    });

    it("parses the Unicode flat sign", () => {
      expect(keyScaleAgreement("E♭ minor", "Eb", "minor")).toBe(true);
      expect(keyScaleAgreement("B♭ major", "B♭", "major")).toBe(true);
    });

    it.each([
      ["C#", "Db"],
      ["D#", "Eb"],
      ["F#", "Gb"],
      ["G#", "Ab"],
      ["A#", "Bb"],
    ])("treats %s and %s as enharmonically equivalent", (sharp, flat) => {
      expect(keyScaleAgreement(`${sharp} major`, flat, "major")).toBe(true);
      expect(keyScaleAgreement(`${flat} minor`, sharp, "minor")).toBe(true);
    });

    it("distinguishes B natural from Bb", () => {
      expect(keyScaleAgreement("B minor", "B", "minor")).toBe(true);
      expect(keyScaleAgreement("B minor", "Bb", "minor")).toBe(false);
    });
  });

  describe("mode detection", () => {
    it("defaults to major when no mode is given", () => {
      expect(keyScaleAgreement("E", "E", "major")).toBe(true);
      expect(keyScaleAgreement("E", "E", "minor")).toBe(false);
    });

    it("defaults the baseline to major when the scale is empty", () => {
      expect(keyScaleAgreement("E major", "E", "")).toBe(true);
    });
  });

  describe("unparseable input", () => {
    it("returns undefined when the candidate has no recognisable note", () => {
      expect(keyScaleAgreement("unknown", "C", "major")).toBeUndefined();
      expect(keyScaleAgreement("H major", "C", "major")).toBeUndefined();
    });

    it("returns undefined for notes outside the pitch-class table", () => {
      expect(keyScaleAgreement("Cb major", "B", "major")).toBeUndefined();
      expect(keyScaleAgreement("E# minor", "F", "minor")).toBeUndefined();
    });

    it("returns undefined when the note is glued to the mode", () => {
      expect(keyScaleAgreement("Cminor", "C", "minor")).toBeUndefined();
      expect(keyScaleAgreement("Am", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the baseline key is unparseable", () => {
      expect(keyScaleAgreement("C major", "", "major")).toBeUndefined();
      expect(keyScaleAgreement("C major", "X", "major")).toBeUndefined();
    });
  });
});
