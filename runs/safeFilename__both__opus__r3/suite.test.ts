import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  describe("base name", () => {
    it("replaces whitespace with a dash and preserves case", () => {
      expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
    });

    it("trims surrounding whitespace", () => {
      expect(safeFilename("  John Smith \t\n", "pdf")).toBe("John-Smith.pdf");
    });

    it("removes each forbidden character", () => {
      for (const ch of ["\\", "/", ":", "*", "?", '"', "<", ">", "|"]) {
        expect(safeFilename(`a${ch}b`, "pdf")).toBe("ab.pdf");
      }
    });

    it("removes all forbidden characters together", () => {
      expect(safeFilename('my\\/:*?"<>|file', "txt")).toBe("myfile.txt");
    });

    it("collapses each run of whitespace into a single dash", () => {
      expect(safeFilename("a   b\t\tc\n d", "pdf")).toBe("a-b-c-d.pdf");
    });

    it("collapses runs of dashes into a single dash", () => {
      expect(safeFilename("a---b", "pdf")).toBe("a-b.pdf");
    });

    it("collapses dashes produced by whitespace next to existing dashes", () => {
      expect(safeFilename("a - b", "pdf")).toBe("a-b.pdf");
    });

    it("strips leading and trailing runs of dashes and dots", () => {
      expect(safeFilename("-.-name.-.", "pdf")).toBe("name.pdf");
      expect(safeFilename("..hidden", "pdf")).toBe("hidden.pdf");
      expect(safeFilename("name...", "pdf")).toBe("name.pdf");
    });

    it("keeps dots and dashes in the middle", () => {
      expect(safeFilename("v1.2-final", "pdf")).toBe("v1.2-final.pdf");
    });

    it("applies removal of forbidden characters before edge stripping", () => {
      expect(safeFilename("/-name-/", "pdf")).toBe("name.pdf");
    });

    it("applies forbidden character removal before whitespace handling", () => {
      expect(safeFilename("a / b", "pdf")).toBe("a-b.pdf");
    });

    it("preserves non-ASCII letters", () => {
      expect(safeFilename("José Müller", "pdf")).toBe("José-Müller.pdf");
    });
  });

  describe("fallback to resume", () => {
    it.each([
      ["empty string", ""],
      ["only whitespace", "   \t\n"],
      ["only forbidden characters", '\\/:*?"<>|'],
      ["only dashes and dots", "-.-..--"],
      ["mixed removable content", ' / . - '],
    ])("uses resume for %s", (_label, raw) => {
      expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
    });
  });

  describe("extension", () => {
    it("prefixes an extension without a leading dot", () => {
      expect(safeFilename("cv", "pdf")).toBe("cv.pdf");
    });

    it("uses an extension with a leading dot as is", () => {
      expect(safeFilename("cv", ".pdf")).toBe("cv.pdf");
    });

    it("produces the same result with or without the leading dot", () => {
      expect(safeFilename("John Smith", ".docx")).toBe(
        safeFilename("John Smith", "docx"),
      );
    });

    it("uses a dotted extension as is with the fallback name", () => {
      expect(safeFilename("", ".pdf")).toBe("resume.pdf");
    });

    it("does not alter extension case", () => {
      expect(safeFilename("cv", "PDF")).toBe("cv.PDF");
    });
  });
});
