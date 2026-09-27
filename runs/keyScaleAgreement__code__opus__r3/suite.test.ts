import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  describe("missing candidate", () => {
    it("returns undefined when the candidate is undefined", () => {
      expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
    });

    it("returns undefined when the candidate is an empty string", () => {
      expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
    });
  });

  describe("matching key and mode", () => {
    it.each([
      ["C major", "C", "major"],
      ["A minor", "A", "minor"],
      ["F# minor", "F#", "minor"],
      ["Bb major", "Bb", "major"],
      ["Eb minor", "Eb", "minor"],
    ])("agrees for %s vs %s %s", (candidate, key, scale) => {
      expect(keyScaleAgreement(candidate, key, scale)).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(keyScaleAgreement("g MINOR", "G", "Minor")).toBe(true);
      expect(keyScaleAgreement("D Major", "d", "MAJOR")).toBe(true);
    });

    it("finds the key inside surrounding text", () => {
      expect(keyScaleAgreement("The key is D minor.", "D", "minor")).toBe(
        true,
      );
    });

    it("treats the flat symbol ♭ as b", () => {
      expect(keyScaleAgreement("B♭ major", "Bb", "major")).toBe(true);
      expect(keyScaleAgreement("Bb major", "B♭", "major")).toBe(true);
    });
  });

  describe("enharmonic equivalents", () => {
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
  });

  describe("disagreement", () => {
    it("returns false when the pitch differs", () => {
      expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
    });

    it("returns false when only the mode differs", () => {
      expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
      expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
    });

    it("does not treat relative major/minor as agreeing", () => {
      expect(keyScaleAgreement("C major", "A", "minor")).toBe(false);
    });

    it("distinguishes natural, sharp and flat notes", () => {
      expect(keyScaleAgreement("B major", "Bb", "major")).toBe(false);
      expect(keyScaleAgreement("F major", "F#", "major")).toBe(false);
    });
  });

  describe("mode defaulting", () => {
    it("treats a candidate without a mode as major", () => {
      expect(keyScaleAgreement("C", "C", "major")).toBe(true);
      expect(keyScaleAgreement("C", "C", "minor")).toBe(false);
    });

    it("treats any scale other than minor as major", () => {
      expect(keyScaleAgreement("C major", "C", "")).toBe(true);
      expect(keyScaleAgreement("C major", "C", "ionian")).toBe(true);
    });

    it("only recognises minor as a whole word", () => {
      expect(keyScaleAgreement("C minorish", "C", "major")).toBe(true);
    });
  });

  describe("unparseable input", () => {
    it.each(["H major", "no key here", "Cm", "C#minor", "Cb major", "E# minor"])(
      "returns undefined for candidate %j",
      (candidate) => {
        expect(keyScaleAgreement(candidate, "C", "major")).toBeUndefined();
      },
    );

    it.each(["H", "", "Fb"])(
      "returns undefined for baseline key %j",
      (key) => {
        expect(keyScaleAgreement("C major", key, "major")).toBeUndefined();
      },
    );
  });
});
