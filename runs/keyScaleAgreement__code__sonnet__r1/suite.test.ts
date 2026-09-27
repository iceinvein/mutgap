import { describe, expect, it } from "vitest";
import { keyScaleAgreement } from "./keyScaleAgreement";

describe("keyScaleAgreement", () => {
  it("returns undefined when candidate is undefined", () => {
    expect(keyScaleAgreement(undefined, "C", "major")).toBeUndefined();
  });

  it("returns undefined when candidate is an empty string", () => {
    expect(keyScaleAgreement("", "C", "major")).toBeUndefined();
  });

  it("returns true when candidate matches key and major scale", () => {
    expect(keyScaleAgreement("C major", "C", "major")).toBe(true);
  });

  it("returns true when candidate matches key and minor scale", () => {
    expect(keyScaleAgreement("A minor", "A", "minor")).toBe(true);
  });

  it("returns false when the pitch class does not match", () => {
    expect(keyScaleAgreement("D major", "C", "major")).toBe(false);
  });

  it("returns false when the mode does not match", () => {
    expect(keyScaleAgreement("C minor", "C", "major")).toBe(false);
  });

  it("treats enharmonic equivalents as matching", () => {
    expect(keyScaleAgreement("C# major", "Db", "major")).toBe(true);
    expect(keyScaleAgreement("Db major", "C#", "major")).toBe(true);
  });

  it("normalises unicode flat symbols before matching", () => {
    expect(keyScaleAgreement("B♭ minor", "Bb", "minor")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(keyScaleAgreement("c MAJOR", "C", "Major")).toBe(true);
  });

  it("defaults to major mode when no mode word is present", () => {
    expect(keyScaleAgreement("C", "C", "major")).toBe(true);
    expect(keyScaleAgreement("C", "C", "minor")).toBe(false);
  });

  it("returns undefined when the candidate has no parseable note", () => {
    expect(keyScaleAgreement("hello there", "C", "major")).toBeUndefined();
  });

  it("returns undefined when the candidate note is not separated from following text", () => {
    expect(keyScaleAgreement("Cmajor", "C", "major")).toBeUndefined();
  });

  it("returns undefined when the key/scale baseline does not parse", () => {
    expect(keyScaleAgreement("C major", "H", "major")).toBeUndefined();
  });
});
