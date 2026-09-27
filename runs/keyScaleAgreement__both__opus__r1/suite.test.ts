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
    it("agrees on the same note and mode", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
    });

    it("finds the key inside surrounding text", () => {
      expect(keyScaleAgreement("Key: Db major", "Db", "major")).toBe(true);
      expect(keyScaleAgreement("The song is in F# minor.", "F#", "minor")).toBe(
        true,
      );
    });

    it("is case-insensitive", () => {
      expect(keyScaleAgreement("a MINOR", "A", "minor")).toBe(true);
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
      "recognises natural note %s",
      (note) => {
        expect(keyScaleAgreement(`${note} major`, note, "major")).toBe(true);
      },
    );
  });

  describe("disagreement", () => {
    it("disagrees when the pitch differs", () => {
      expect(keyScaleAgreement("A minor", "B", "minor")).toBe(false);
      expect(keyScaleAgreement("C# major", "C", "major")).toBe(false);
      expect(keyScaleAgreement("Db major", "D", "major")).toBe(false);
    });

    it("disagrees when the mode differs", () => {
      expect(keyScaleAgreement("A minor", "A", "major")).toBe(false);
      expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
    });

    it("does not treat relative major/minor as agreeing", () => {
      expect(keyScaleAgreement("A minor", "C", "major")).toBe(false);
    });
  });

  describe("mode parsing", () => {
    it("prefers minor when both minor and major appear", () => {
      expect(keyScaleAgreement("A major or minor", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("A major or minor", "A", "major")).toBe(false);
    });

    it("returns undefined when the candidate has no mode", () => {
      expect(keyScaleAgreement("A", "A", "major")).toBeUndefined();
      expect(keyScaleAgreement("A dorian", "A", "major")).toBeUndefined();
    });

    it("returns undefined when the reference has no mode", () => {
      expect(keyScaleAgreement("A major", "A", "")).toBeUndefined();
      expect(keyScaleAgreement("A major", "A", "dorian")).toBeUndefined();
    });

    it("requires minor to be a whole word", () => {
      expect(keyScaleAgreement("A minority", "A", "major")).toBeUndefined();
      expect(keyScaleAgreement("A minority major", "A", "major")).toBe(true);
    });

    it("requires major to be a whole word", () => {
      expect(keyScaleAgreement("A majority", "A", "major")).toBeUndefined();
    });
  });

  describe("note parsing", () => {
    it("returns undefined when the candidate has no note", () => {
      expect(keyScaleAgreement("minor", "A", "minor")).toBeUndefined();
      expect(keyScaleAgreement("H minor", "A", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference has no note", () => {
      expect(keyScaleAgreement("A minor", "", "minor")).toBeUndefined();
      expect(keyScaleAgreement("A minor", "H", "minor")).toBeUndefined();
    });

    it("requires the note to begin a word", () => {
      // "a" in "Dha" is not at a word start; the real note is "B".
      expect(keyScaleAgreement("Dha B minor", "B", "minor")).toBe(true);
    });

    it("requires the note to be followed by whitespace or end of text", () => {
      // "Amazing" starts with A but A is not followed by whitespace.
      expect(keyScaleAgreement("Amazing: E minor", "E", "minor")).toBe(true);
      expect(keyScaleAgreement("minor in G", "G", "minor")).toBe(true);
    });

    it("uses the first qualifying note", () => {
      expect(keyScaleAgreement("G or A minor", "G", "minor")).toBe(true);
      expect(keyScaleAgreement("G or A minor", "A", "minor")).toBe(false);
    });

    it.each(["Cb", "Fb", "E#", "B#"])(
      "does not recognise %s",
      (note) => {
        expect(keyScaleAgreement(`${note} major`, "B", "major")).toBeUndefined();
        expect(keyScaleAgreement("B major", note, "major")).toBeUndefined();
      },
    );
  });
});
