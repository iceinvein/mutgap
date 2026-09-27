import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  describe("base name", () => {
    it("preserves letter case and replaces spaces with a dash", () => {
      expect(safeFilename("John Smith", "pdf")).toBe("John-Smith.pdf");
    });

    it("trims surrounding whitespace", () => {
      expect(safeFilename("  John Smith \t\n", "pdf")).toBe("John-Smith.pdf");
    });

    it.each(["\\", "/", ":", "*", "?", '"', "<", ">", "|"])(
      "removes the forbidden character %s",
      (ch) => {
        expect(safeFilename(`ab${ch}cd`, "pdf")).toBe("abcd.pdf");
      },
    );

    it("removes all forbidden characters together", () => {
      expect(safeFilename('a\\/:*?"<>|b', "pdf")).toBe("ab.pdf");
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

    it("collapses whitespace left around removed forbidden characters", () => {
      expect(safeFilename("a / b", "pdf")).toBe("a-b.pdf");
    });

    it("strips leading and trailing runs of dashes and dots", () => {
      expect(safeFilename("-.-name.-.", "pdf")).toBe("name.pdf");
      expect(safeFilename("...hidden", "pdf")).toBe("hidden.pdf");
      expect(safeFilename("name---", "pdf")).toBe("name.pdf");
    });

    it("keeps interior dots and dashes", () => {
      expect(safeFilename("v1.2-final", "pdf")).toBe("v1.2-final.pdf");
    });

    it("strips a trailing dash left behind by a removed forbidden character", () => {
      expect(safeFilename("name ?", "pdf")).toBe("name.pdf");
    });

    it("leaves other characters untouched", () => {
      expect(safeFilename("Zoë_Résumé(2)", "pdf")).toBe("Zoë_Résumé(2).pdf");
    });
  });

  describe("fallback", () => {
    it.each([
      ["empty string", ""],
      ["only whitespace", "   \t\n"],
      ["only forbidden characters", '\\/:*?"<>|'],
      ["only dashes and dots", "-.-..--"],
      ["forbidden characters, whitespace, dots and dashes", ' ?. - */ '],
    ])("uses 'resume' when the base is empty (%s)", (_label, raw) => {
      expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
    });
  });

  describe("extension", () => {
    it("prefixes an extension without a leading dot", () => {
      expect(safeFilename("cv", "pdf")).toBe("cv.pdf");
    });

    it("uses an extension that already has a leading dot as is", () => {
      expect(safeFilename("cv", ".pdf")).toBe("cv.pdf");
    });

    it("produces the same result with or without the leading dot", () => {
      expect(safeFilename("John Smith", ".docx")).toBe(
        safeFilename("John Smith", "docx"),
      );
    });

    it("applies the extension to the fallback name", () => {
      expect(safeFilename("", "txt")).toBe("resume.txt");
    });
  });
});
