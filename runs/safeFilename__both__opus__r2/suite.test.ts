import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  describe("base name", () => {
    it("keeps letter case and replaces spaces with -", () => {
      expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
    });

    it("trims surrounding whitespace", () => {
      expect(safeFilename("  John Smith \t\n", "pdf")).toBe("John-Smith.pdf");
    });

    it("removes forbidden characters", () => {
      expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', "pdf")).toBe("abcdefghij.pdf");
    });

    it("collapses each run of whitespace to a single -", () => {
      expect(safeFilename("a   b\t\tc\n d", "pdf")).toBe("a-b-c-d.pdf");
    });

    it("collapses runs of -", () => {
      expect(safeFilename("a---b", "pdf")).toBe("a-b.pdf");
      expect(safeFilename("a - b", "pdf")).toBe("a-b.pdf");
    });

    it("collapses - left adjacent after forbidden characters are removed", () => {
      expect(safeFilename("a-/-b", "pdf")).toBe("a-b.pdf");
    });

    it("removes leading and trailing runs of - and .", () => {
      expect(safeFilename(".-.name.-.", "pdf")).toBe("name.pdf");
      expect(safeFilename("...hidden", "pdf")).toBe("hidden.pdf");
      expect(safeFilename("-name-", "pdf")).toBe("name.pdf");
    });

    it("keeps interior dots", () => {
      expect(safeFilename("v1.2 final", "pdf")).toBe("v1.2-final.pdf");
    });

    it("strips leading/trailing - produced from forbidden chars and whitespace", () => {
      expect(safeFilename("/ John /", "pdf")).toBe("John.pdf");
    });

    it("keeps non-ASCII letters", () => {
      expect(safeFilename("Zoë Ångström", "pdf")).toBe("Zoë-Ångström.pdf");
    });
  });

  describe("fallback to resume", () => {
    it.each([
      ["empty string", ""],
      ["only whitespace", "   \t\n"],
      ["only forbidden chars", '\\/:*?"<>|'],
      ["only dashes and dots", "-.-..--"],
      ["mix of the above", ' / . - | '],
    ])("uses resume for %s", (_label, raw) => {
      expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
    });
  });

  describe("extension", () => {
    it("prefixes . when the extension has none", () => {
      expect(safeFilename("cv", "pdf")).toBe("cv.pdf");
    });

    it("uses an extension that already starts with . as is", () => {
      expect(safeFilename("cv", ".pdf")).toBe("cv.pdf");
    });

    it("gives the same result with or without the leading dot", () => {
      expect(safeFilename("John Smith", ".docx")).toBe(
        safeFilename("John Smith", "docx"),
      );
    });

    it("applies to the resume fallback too", () => {
      expect(safeFilename("", ".pdf")).toBe("resume.pdf");
    });
  });
});
