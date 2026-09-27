import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  it("returns undefined when candidate is undefined", () => {
    expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
  });

  it("returns undefined when candidate is an empty string", () => {
    expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
  });

  it("returns true when pitch and mode both match", () => {
    expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(keyScaleAgreement("c MAJOR", "c", "MAJOR")).toBe(true);
  });

  it("returns false when pitch matches but mode differs", () => {
    expect(keyScaleAgreement("C major", "C", "minor")).toBe(false);
  });

  it("returns false when mode matches but pitch differs", () => {
    expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
  });

  it("treats sharps and their enharmonic flat equivalents as the same pitch", () => {
    expect(keyScaleAgreement("C#", "Db", "major")).toBe(true);
    expect(keyScaleAgreement("Db", "C#", "major")).toBe(true);
  });

  it("detects minor mode from the word 'minor' in the candidate", () => {
    expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
    expect(keyScaleAgreement("A", "A", "minor")).toBe(false);
  });

  it("understands the flat symbol '♭'", () => {
    expect(keyScaleAgreement("B♭ major", "Bb", "major")).toBe(true);
  });

  it("finds the pitch even when it isn't at the start of the string", () => {
    expect(keyScaleAgreement("Key of C major", "C", "major")).toBe(true);
  });

  it("returns undefined when the candidate has no recognisable pitch", () => {
    expect(keyScaleAgreement("unknown", "C", "major")).toBeUndefined();
  });

  it("returns undefined for an unsupported pitch spelling like 'Cb'", () => {
    expect(keyScaleAgreement("Cb", "C", "major")).toBeUndefined();
  });

  it("returns undefined when the key/scale baseline is invalid", () => {
    expect(keyScaleAgreement("C major", "H", "major")).toBeUndefined();
  });

  it("tolerates extra whitespace around the note and mode", () => {
    expect(keyScaleAgreement("  C   Major  ", "C", "major")).toBe(true);
  });
});
