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
    it("is true when note and mode both match exactly", () => {
      expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
    });

    it("is true for enharmonic sharp/flat spellings of the same pitch", () => {
      expect(keyScaleAgreement("Db major", "C#", "major")).toBe(true);
      expect(keyScaleAgreement("C# major", "Db", "major")).toBe(true);
    });

    it("is false when the pitch differs", () => {
      expect(keyScaleAgreement("D minor", "C", "minor")).toBe(false);
    });

    it("is false when the mode differs", () => {
      expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(keyScaleAgreement("a MINOR", "A", "Minor")).toBe(true);
    });

    it("reads ♭ as b", () => {
      expect(keyScaleAgreement("A♭ minor", "Ab", "minor")).toBe(true);
      expect(keyScaleAgreement("G# minor", "A♭", "minor")).toBe(true);
    });

    it("ignores surrounding text and picks out the note and mode", () => {
      expect(keyScaleAgreement("Key: Db major", "C#", "major")).toBe(true);
    });

    it("treats minor as taking priority when both mode words appear", () => {
      expect(keyScaleAgreement("A minor or major", "A", "minor")).toBe(true);
      expect(keyScaleAgreement("A minor or major", "A", "major")).toBe(false);
    });
  });

  describe("unparseable text", () => {
    it("returns undefined when the candidate has no recognised note", () => {
      expect(keyScaleAgreement("minor scale", "C", "minor")).toBeUndefined();
    });

    it("does not recognise a note that isn't at the start of a word", () => {
      expect(keyScaleAgreement("Band minor", "C", "minor")).toBeUndefined();
    });

    it("does not recognise a note unless followed by whitespace or the end of the text", () => {
      expect(keyScaleAgreement("Ab12 minor", "C", "minor")).toBeUndefined();
    });

    it.each(["Cb", "Fb", "E#", "B#"])(
      "does not recognise the invalid spelling %s",
      (spelling) => {
        expect(
          keyScaleAgreement(`${spelling} minor`, "C", "minor"),
        ).toBeUndefined();
      },
    );

    it("returns undefined when the candidate has no mode word", () => {
      expect(keyScaleAgreement("A", "C", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference key/scale is unparseable", () => {
      expect(keyScaleAgreement("A minor", "H", "minor")).toBeUndefined();
    });

    it("returns undefined when the reference scale has no mode word", () => {
      expect(keyScaleAgreement("C major", "C", "dorian")).toBeUndefined();
    });
  });
});
