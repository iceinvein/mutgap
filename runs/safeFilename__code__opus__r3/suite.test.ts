import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("appends the extension to a clean name", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims surrounding whitespace", () => {
    expect(safeFilename("  Jane Doe  ", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("replaces runs of whitespace with a single dash", () => {
    expect(safeFilename("Jane \t  Doe\nCV", "pdf")).toBe("Jane-Doe-CV.pdf");
  });

  it("removes characters forbidden in paths", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "txt")).toBe("abcdefghij.txt");
  });

  it("strips path separators so the result cannot escape a directory", () => {
    expect(safeFilename("../../etc/passwd", "txt")).toBe("etcpasswd.txt");
  });

  it("collapses consecutive dashes", () => {
    expect(safeFilename("a---b - c", "pdf")).toBe("a-b-c.pdf");
  });

  it("collapses dashes left behind after removing forbidden characters", () => {
    expect(safeFilename("a - / - b", "pdf")).toBe("a-b.pdf");
  });

  it("strips leading and trailing dashes and dots", () => {
    expect(safeFilename("-.-name.-.", "pdf")).toBe("name.pdf");
    expect(safeFilename(".hidden", "pdf")).toBe("hidden.pdf");
  });

  it("keeps interior dots and dashes", () => {
    expect(safeFilename("v1.2-final", "pdf")).toBe("v1.2-final.pdf");
  });

  it("preserves case and non-ASCII characters", () => {
    expect(safeFilename("José Müller", "pdf")).toBe("José-Müller.pdf");
  });

  it.each([
    ["empty string", ""],
    ["whitespace only", "   \t\n "],
    ["forbidden chars only", '/\\:*?"<>|'],
    ["dots and dashes only", "..-.-.."],
  ])("falls back to 'resume' for %s", (_label, raw) => {
    expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
  });

  it("uses the extension verbatim", () => {
    expect(safeFilename("doc", "docx")).toBe("doc.docx");
    expect(safeFilename("archive", "tar.gz")).toBe("archive.tar.gz");
  });
});
