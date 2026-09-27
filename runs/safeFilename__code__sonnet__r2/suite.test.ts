import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("keeps a simple alphanumeric name and appends the extension", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims leading and trailing whitespace", () => {
    expect(safeFilename("  resume  ", "pdf")).toBe("resume.pdf");
  });

  it("strips characters forbidden across OSes", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
  });

  it("collapses runs of whitespace into a single hyphen", () => {
    expect(safeFilename("my   resume\tfile", "pdf")).toBe("my-resume-file.pdf");
  });

  it("collapses runs of hyphens into a single hyphen", () => {
    expect(safeFilename("a---b--c", "pdf")).toBe("a-b-c.pdf");
  });

  it("strips leading and trailing hyphens and dots", () => {
    expect(safeFilename("--.foo.bar.--", "pdf")).toBe("foo.bar.pdf");
  });

  it("falls back to 'resume' when the sanitized name is empty", () => {
    expect(safeFilename("", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only whitespace", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only forbidden characters", () => {
    expect(safeFilename('***///:::', "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only leading/trailing hyphens and dots", () => {
    expect(safeFilename("---...---", "pdf")).toBe("resume.pdf");
  });

  it("uses the provided extension", () => {
    expect(safeFilename("resume", "docx")).toBe("resume.docx");
  });

  it("preserves case and internal dots/underscores", () => {
    expect(safeFilename("My_Resume.v2", "pdf")).toBe("My_Resume.v2.pdf");
  });
});
