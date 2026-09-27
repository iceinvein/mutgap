import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("appends the given extension", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims leading and trailing whitespace", () => {
    expect(safeFilename("  resume  ", "pdf")).toBe("resume.pdf");
  });

  it("replaces whitespace runs with a single hyphen", () => {
    expect(safeFilename("my   resume file", "pdf")).toBe("my-resume-file.pdf");
  });

  it("strips forbidden path characters", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
  });

  it("collapses repeated hyphens into one", () => {
    expect(safeFilename("a---b", "pdf")).toBe("a-b.pdf");
  });

  it("collapses hyphens produced by removing forbidden characters between spaces", () => {
    expect(safeFilename("a * b", "pdf")).toBe("a-b.pdf");
  });

  it("strips leading and trailing hyphens and dots", () => {
    expect(safeFilename("--.resume.--", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the sanitized name is empty", () => {
    expect(safeFilename("", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only whitespace", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only forbidden characters", () => {
    expect(safeFilename('*?"<>|', "pdf")).toBe("resume.pdf");
  });

  it("preserves interior dots", () => {
    expect(safeFilename("my.resume.v2", "pdf")).toBe("my.resume.v2.pdf");
  });

  it("supports arbitrary extensions", () => {
    expect(safeFilename("resume", "docx")).toBe("resume.docx");
  });

  it("preserves case", () => {
    expect(safeFilename("MyResume", "pdf")).toBe("MyResume.pdf");
  });
});
