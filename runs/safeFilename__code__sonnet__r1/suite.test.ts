import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("appends the given extension", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims leading and trailing whitespace", () => {
    expect(safeFilename("  resume  ", "pdf")).toBe("resume.pdf");
  });

  it("replaces internal whitespace with dashes", () => {
    expect(safeFilename("my resume file", "pdf")).toBe("my-resume-file.pdf");
  });

  it("collapses runs of whitespace into a single dash", () => {
    expect(safeFilename("my   resume", "pdf")).toBe("my-resume.pdf");
  });

  it("collapses multiple consecutive dashes into one", () => {
    expect(safeFilename("my--resume", "pdf")).toBe("my-resume.pdf");
  });

  it("strips characters forbidden across OS filesystems", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
  });

  it("strips leading and trailing dashes and dots", () => {
    expect(safeFilename("--.resume.--", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the sanitized name is empty", () => {
    expect(safeFilename("", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only whitespace", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only forbidden characters", () => {
    expect(safeFilename('***???', "pdf")).toBe("resume.pdf");
  });

  it("preserves internal dots and case", () => {
    expect(safeFilename("My.Resume.v2", "pdf")).toBe("My.Resume.v2.pdf");
  });

  it("supports arbitrary extensions", () => {
    expect(safeFilename("resume", "docx")).toBe("resume.docx");
  });
});
