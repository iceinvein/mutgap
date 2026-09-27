import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  describe("base name derivation", () => {
    it("trims surrounding whitespace", () => {
      expect(safeFilename("  John Smith  ", "pdf")).toBe("John-Smith.pdf");
    });

    it("preserves letter case", () => {
      expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
    });

    it("removes forbidden path characters", () => {
      expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "txt")).toBe("abcdefghij.txt");
    });

    it("collapses a run of whitespace into a single dash", () => {
      expect(safeFilename("foo   bar", "txt")).toBe("foo-bar.txt");
    });

    it("collapses tabs and newlines as whitespace too", () => {
      expect(safeFilename("foo\t\nbar", "txt")).toBe("foo-bar.txt");
    });

    it("collapses a run of dashes into a single dash", () => {
      expect(safeFilename("foo---bar", "txt")).toBe("foo-bar.txt");
    });

    it("collapses dashes produced by whitespace collapsing next to literal dashes", () => {
      expect(safeFilename("foo - bar", "txt")).toBe("foo-bar.txt");
    });

    it("strips a run of leading dashes and dots", () => {
      expect(safeFilename("--..foo", "txt")).toBe("foo.txt");
    });

    it("strips a run of trailing dashes and dots", () => {
      expect(safeFilename("foo..--", "txt")).toBe("foo.txt");
    });

    it("strips leading/trailing dash-dot runs but keeps interior dots", () => {
      expect(safeFilename(".foo.bar.", "txt")).toBe("foo.bar.txt");
    });

    it("falls back to 'resume' when the result is empty", () => {
      expect(safeFilename("", "pdf")).toBe("resume.pdf");
    });

    it("falls back to 'resume' when input is only whitespace", () => {
      expect(safeFilename("   ", "pdf")).toBe("resume.pdf");
    });

    it("falls back to 'resume' when input is only forbidden characters", () => {
      expect(safeFilename('*?"<>|', "pdf")).toBe("resume.pdf");
    });

    it("falls back to 'resume' when input is only dashes and dots", () => {
      expect(safeFilename("---...", "pdf")).toBe("resume.pdf");
    });
  });

  describe("extension normalisation", () => {
    it("adds a leading dot when the extension has none", () => {
      expect(safeFilename("report", "pdf")).toBe("report.pdf");
    });

    it("does not double the dot when the extension already has one", () => {
      expect(safeFilename("report", ".pdf")).toBe("report.pdf");
    });
  });
});
