import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it("returns undefined when candidate is undefined", () => {
      expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
    });

    it("returns undefined when candidate is empty", () => {
      expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
    });
  });

  describe("agreement", () => {
    it("returns true when note and mode both match exactly", () => {
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
    });

    it("returns true for minor keys that match exactly", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(keyScaleAgreement("a MINOR", "A", "minor")).toBe(true);
    });

    it("accepts free text such as 'Key: Db major'", () => {
      expect(keyScaleAgreement("Key: Db major", "Db", "major")).toBe(true);
    });

    it("treats sharps and flats as equivalent (C# / Db)", () => {
      expect(keyScaleAgreement("C# minor", "Db", "minor")).toBe(true);
    });

    it("treats sharps and flats as equivalent (F# / Gb)", () => {
      expect(keyScaleAgreement("F# major", "Gb", "major")).toBe(true);
    });

    it("treats sharps and flats as equivalent (G# / Ab)", () => {
      expect(keyScaleAgreement("Ab minor", "G#", "minor")).toBe(true);
    });

    it("reads ♭ as b", () => {
      expect(keyScaleAgreement("B♭ major", "Bb", "major")).toBe(true);
    });

    it("reads ♭ as b on the reference side too", () => {
      expect(keyScaleAgreement("Bb major", "B♭", "major")).toBe(true);
    });
  });

  describe("disagreement", () => {
    it("returns false when the pitch differs", () => {
      expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
    });

    it("returns false when the mode differs", () => {
      expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
    });

    it("returns false when both pitch and mode differ", () => {
      expect(keyScaleAgreement("D minor", "C", "major")).toBe(false);
    });
  });

  describe("unparseable candidate", () => {
    it("returns undefined when the candidate has no recognised note", () => {
      expect(keyScaleAgreement("minor", "C", "major")).toBeUndefined();
    });

    it("returns undefined when the candidate has no mode", () => {
      expect(keyScaleAgreement("C", "C", "major")).toBeUndefined();
    });

    it("does not recognise Cb", () => {
      expect(keyScaleAgreement("Cb major", "C", "major")).toBeUndefined();
    });

    it("does not recognise Fb", () => {
      expect(keyScaleAgreement("Fb major", "C", "major")).toBeUndefined();
    });

    it("does not recognise E#", () => {
      expect(keyScaleAgreement("E# minor", "C", "major")).toBeUndefined();
    });

    it("does not recognise B#", () => {
      expect(keyScaleAgreement("B# minor", "C", "major")).toBeUndefined();
    });

    it("requires the note to begin a word", () => {
      expect(keyScaleAgreement("Cmajor", "C", "major")).toBeUndefined();
    });

    it("requires whole-word 'minor', not a suffix like 'Aminor'", () => {
      expect(keyScaleAgreement("Aminor", "A", "minor")).toBeUndefined();
    });
  });

  describe("unparseable reference", () => {
    it("returns undefined when the key is not a recognised note", () => {
      expect(keyScaleAgreement("C major", "H", "major")).toBeUndefined();
    });

    it("returns undefined when the scale has no recognised mode word", () => {
      expect(keyScaleAgreement("C major", "C", "dorian")).toBeUndefined();
    });

    it("returns undefined when both sides are unparseable", () => {
      expect(keyScaleAgreement("nonsense", "H", "dorian")).toBeUndefined();
    });
  });
});
