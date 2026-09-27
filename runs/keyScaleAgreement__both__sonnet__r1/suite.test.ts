import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it("returns undefined for undefined candidate", () => {
      expect(keyScaleAgreement(undefined, "A", "minor")).toBeUndefined();
    });

    it("returns undefined for empty candidate", () => {
      expect(keyScaleAgreement("", "A", "minor")).toBeUndefined();
    });
  });

  describe("agreement", () => {
    it("agrees when pitch and mode match exactly", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
    });

    it("agrees for major", () => {
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
    });

    it("disagrees on mode", () => {
      expect(keyScaleAgreement("A major", "A", "minor")).toBe(false);
    });

    it("disagrees on pitch", () => {
      expect(keyScaleAgreement("C minor", "A", "minor")).toBe(false);
    });

    it("disagrees when both pitch and mode differ", () => {
      expect(keyScaleAgreement("C major", "A", "minor")).toBe(false);
    });
  });

  describe("enharmonic spellings", () => {
    it("treats C# and Db as the same pitch", () => {
      expect(keyScaleAgreement("C# minor", "Db", "minor")).toBe(true);
    });

    it("treats Db and C# as the same pitch (reversed)", () => {
      expect(keyScaleAgreement("Db minor", "C#", "minor")).toBe(true);
    });

    it("treats all sharp/flat pairs as equivalent", () => {
      expect(keyScaleAgreement("D# major", "Eb", "major")).toBe(true);
      expect(keyScaleAgreement("Gb major", "F#", "major")).toBe(true);
      expect(keyScaleAgreement("Ab minor", "G#", "minor")).toBe(true);
      expect(keyScaleAgreement("A# minor", "Bb", "minor")).toBe(true);
    });

    it("still disagrees on mode even when pitch is enharmonically equal", () => {
      expect(keyScaleAgreement("C# minor", "Db", "major")).toBe(false);
    });
  });

  describe("case insensitivity and flat symbol", () => {
    it("is case-insensitive", () => {
      expect(keyScaleAgreement("a MINOR", "A", "minor")).toBe(true);
    });

    it("reads ♭ as b", () => {
      expect(keyScaleAgreement("D♭ major", "C#", "major")).toBe(true);
    });

    it("reads ♭ as b in the reference too", () => {
      expect(keyScaleAgreement("C# major", "D♭", "major")).toBe(true);
    });
  });

  describe("free text parsing", () => {
    it("extracts note and mode from surrounding text", () => {
      expect(keyScaleAgreement("Key: Db major", "C#", "major")).toBe(true);
    });

    it("does not match a letter embedded in a larger word", () => {
      expect(keyScaleAgreement("Cats minor", "A", "minor")).toBeUndefined();
    });

    it("finds the note even when it is not the first word", () => {
      expect(keyScaleAgreement("detected key A minor", "A", "minor")).toBe(
        true,
      );
    });
  });

  describe("unrecognised note spellings", () => {
    it("does not recognise Cb", () => {
      expect(keyScaleAgreement("Cb minor", "A", "minor")).toBeUndefined();
    });

    it("does not recognise Fb", () => {
      expect(keyScaleAgreement("Fb major", "A", "minor")).toBeUndefined();
    });

    it("does not recognise E#", () => {
      expect(keyScaleAgreement("E# minor", "A", "minor")).toBeUndefined();
    });

    it("does not recognise B#", () => {
      expect(keyScaleAgreement("B# major", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference uses an unrecognised spelling", () => {
      expect(keyScaleAgreement("A minor", "Cb", "minor")).toBeUndefined();
    });
  });

  describe("missing mode", () => {
    it("returns undefined when the candidate has no mode word", () => {
      expect(keyScaleAgreement("A", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no mode word", () => {
      expect(keyScaleAgreement("A minor", "A", "dorian")).toBeUndefined();
    });

    it("returns undefined when neither side has a mode", () => {
      expect(keyScaleAgreement("A", "A", "")).toBeUndefined();
    });
  });

  describe("missing note", () => {
    it("returns undefined when the candidate has no recognisable note", () => {
      expect(keyScaleAgreement("minor", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no recognisable note", () => {
      expect(keyScaleAgreement("A minor", "", "minor")).toBeUndefined();
    });
  });
});
