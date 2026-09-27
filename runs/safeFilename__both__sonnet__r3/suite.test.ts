import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("preserves case and joins words with a single dash", () => {
    expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("trims surrounding whitespace", () => {
    expect(safeFilename("  John Smith  ", "pdf")).toBe("John-Smith.pdf");
  });

  it("removes forbidden path characters", () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
  });

  it("collapses a run of whitespace into a single dash", () => {
    expect(safeFilename("John   Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("collapses a run of dashes into a single dash", () => {
    expect(safeFilename("John----Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("collapses mixed whitespace and dash runs into a single dash", () => {
    expect(safeFilename("John - -  Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("strips leading and trailing dashes", () => {
    expect(safeFilename("--John Smith--", "pdf")).toBe("John-Smith.pdf");
  });

  it("strips leading and trailing dots", () => {
    expect(safeFilename("...John Smith...", "pdf")).toBe("John-Smith.pdf");
  });

  it("strips leading and trailing runs of mixed dashes and dots", () => {
    expect(safeFilename("-.-.John Smith.-.-", "pdf")).toBe("John-Smith.pdf");
  });

  it("does not strip dots or dashes in the middle of the name", () => {
    expect(safeFilename("John.A-Smith", "pdf")).toBe("John.A-Smith.pdf");
  });

  it("falls back to 'resume' when the base name is empty", () => {
    expect(safeFilename("", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only whitespace", () => {
    expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only forbidden characters", () => {
    expect(safeFilename('\\/:*?"<>|', "pdf")).toBe("resume.pdf");
  });

  it("falls back to 'resume' when the input is only dashes and dots", () => {
    expect(safeFilename("---...---", "pdf")).toBe("resume.pdf");
  });

  it("adds a leading dot to an extension given without one", () => {
    expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
  });

  it("uses an extension given with a leading dot as-is", () => {
    expect(safeFilename("John Smith", ".pdf")).toBe("John-Smith.pdf");
  });

  it("does not add a second dot for a dotted extension", () => {
    expect(safeFilename("John Smith", ".tar.gz")).toBe("John-Smith.tar.gz");
  });
});
