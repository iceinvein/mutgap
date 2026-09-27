import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  it("returns undefined when candidate is undefined", () => {
    expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
  });

  it("returns undefined when candidate is an empty string", () => {
    expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
  });

  it("returns undefined when candidate cannot be parsed", () => {
    expect(keyScaleAgreement("xyz", "C", "major")).toBeUndefined();
  });

  it("returns undefined when key/scale cannot be parsed", () => {
    expect(keyScaleAgreement("C major", "nope", "major")).toBeUndefined();
  });

  it("returns true when candidate matches key and major scale", () => {
    expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
  });

  it("returns true when candidate matches key and minor scale", () => {
    expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
  });

  it("returns false when pitch matches but mode differs", () => {
    expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
  });

  it("returns false when mode matches but pitch differs", () => {
    expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
  });

  it("returns false when both pitch and mode differ", () => {
    expect(keyScaleAgreement("D minor", "C", "major")).toBe(false);
  });

  it("treats enharmonic sharps and flats as equivalent", () => {
    expect(keyScaleAgreement("C# major", "Db", "major")).toBe(true);
    expect(keyScaleAgreement("Eb major", "D#", "major")).toBe(true);
  });

  it("treats the unicode flat symbol the same as a lowercase b", () => {
    expect(keyScaleAgreement("B♭ major", "Bb", "major")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(keyScaleAgreement("c MAJOR", "C", "major")).toBe(true);
    expect(keyScaleAgreement("C MAJOR", "c", "MAJOR")).toBe(true);
  });

  it("defaults to major when candidate has no explicit mode", () => {
    expect(keyScaleAgreement("C", "C", "major")).toBe(true);
    expect(keyScaleAgreement("C", "C", "minor")).toBe(false);
  });

  it("defaults key/scale baseline to major when scale has no explicit mode", () => {
    expect(keyScaleAgreement("C major", "C", "")).toBe(true);
  });
});
