import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it.each([undefined, ""])("returns undefined for %j", (candidate) => {
      expect(keyScaleAgreement(candidate, "C", "major")).toBeUndefined();
    });
  });

  describe("matching keys", () => {
    it.each([
      ["C major", "C", "major"],
      ["A minor", "A", "minor"],
      ["F# minor", "F#", "minor"],
      ["Bb major", "Bb", "major"],
      ["B minor", "B", "minor"],
    ])("%s agrees with %s %s", (candidate, key, scale) => {
      expect(keyScaleAgreement(candidate, key, scale)).toBe(true);
    });

    it("ignores case", () => {
      expect(keyScaleAgreement("c MAJOR", "C", "Major")).toBe(true);
      expect(keyScaleAgreement("G MINOR", "g", "minor")).toBe(true);
    });

    it("treats the flat symbol ♭ as b", () => {
      expect(keyScaleAgreement("E♭ minor", "Eb", "minor")).toBe(true);
      expect(keyScaleAgreement("Eb minor", "E♭", "minor")).toBe(true);
    });

    it.each([
      ["C# major", "Db"],
      ["D# major", "Eb"],
      ["F# major", "Gb"],
      ["G# major", "Ab"],
      ["A# major", "Bb"],
    ])("treats enharmonic %s and %s as the same key", (candidate, key) => {
      expect(keyScaleAgreement(candidate, key, "major")).toBe(true);
      expect(keyScaleAgreement(`${key} major`, candidate.split(" ")[0]!, "major")).toBe(true);
    });

    it("finds the key inside surrounding text", () => {
      expect(keyScaleAgreement("The key is E minor", "E", "minor")).toBe(true);
    });

    it("defaults to major when no mode is given", () => {
      expect(keyScaleAgreement("D", "D", "major")).toBe(true);
      expect(keyScaleAgreement("D", "D", "minor")).toBe(false);
    });
  });

  describe("disagreeing keys", () => {
    it("returns false for a different tonic with the same mode", () => {
      expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
    });

    it("returns false for the same tonic with a different mode", () => {
      expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
      expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
    });

    it("returns false for relative major/minor keys", () => {
      expect(keyScaleAgreement("A minor", "C", "major")).toBe(false);
    });

    it("distinguishes sharps and flats from the natural note", () => {
      expect(keyScaleAgreement("F# major", "F", "major")).toBe(false);
      expect(keyScaleAgreement("Bb major", "B", "major")).toBe(false);
    });
  });

  describe("unparseable input", () => {
    it.each(["H major", "unknown", "major", "Cb major", "E# minor"])(
      "returns undefined for candidate %j",
      (candidate) => {
        expect(keyScaleAgreement(candidate, "C", "major")).toBeUndefined();
      },
    );

    it("returns undefined when the baseline key cannot be parsed", () => {
      expect(keyScaleAgreement("C major", "", "major")).toBeUndefined();
      expect(keyScaleAgreement("C major", "X", "major")).toBeUndefined();
    });
  });
});
