import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("replaces whitespace with a single dash and preserves case", () => {
    expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("trims surrounding whitespace", () => {
    expect(safeFilename("  John Smith  ", "pdf")).toBe("John-Smith.pdf");
  });

  it("removes forbidden path characters", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
  });

  it("collapses runs of whitespace into a single dash", () => {
    expect(safeFilename("John   \t\n  Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("collapses runs of dashes into a single dash", () => {
    expect(safeFilename("John---Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("collapses dashes produced by removed characters adjacent to existing dashes", () => {
    expect(safeFilename("John - / Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("strips leading and trailing runs of dashes and dots", () => {
    expect(safeFilename("--..John-Smith..--", "pdf")).toBe("John-Smith.pdf");
  });

  it("strips a leading/trailing mix of dashes and dots in any order", () => {
    expect(safeFilename("-.-.report.-.-", "pdf")).toBe("report.pdf");
  });

  it("falls back to 'resume' when the base name is empty", () => {
    expect(safeFilename("", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when only whitespace is given", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when only forbidden characters are given", () => {
    expect(safeFilename('\\/:*?"<>|', "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when only dashes and dots are given", () => {
    expect(safeFilename("--...--", "pdf")).toBe("resume.pdf");
  });

  it("accepts an extension without a leading dot", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("accepts an extension with a leading dot unchanged", () => {
    expect(safeFilename("resume", ".pdf")).toBe("resume.pdf");
  });

  it("preserves letter case in the base name", () => {
    expect(safeFilename("ReSuMe FILE", "pdf")).toBe("ReSuMe-FILE.pdf");
  });
});
