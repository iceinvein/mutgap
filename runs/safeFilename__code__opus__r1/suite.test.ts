import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("appends the extension to a simple name", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims surrounding whitespace", () => {
    expect(safeFilename("  Jane Doe  ", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("replaces internal whitespace runs with a single hyphen", () => {
    expect(safeFilename("Jane \t\n  Doe", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("collapses repeated hyphens", () => {
    expect(safeFilename("Jane---Doe", "pdf")).toBe("Jane-Doe.pdf");
    expect(safeFilename("Jane - Doe", "pdf")).toBe("Jane-Doe.pdf");
  });

  it.each(["\\", "/", ":", "*", "?", '"', "<", ">", "|"])(
    "removes forbidden character %s",
    (ch) => {
      expect(safeFilename(`a${ch}b`, "pdf")).toBe("ab.pdf");
    },
  );

  it("removes path separators so the result cannot traverse directories", () => {
    expect(safeFilename("../../etc/passwd", "txt")).toBe("etcpasswd.txt");
    expect(safeFilename("..\\..\\windows", "txt")).toBe("windows.txt");
  });

  it("collapses whitespace left behind by removed characters", () => {
    expect(safeFilename("Jane / Doe", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("strips leading and trailing hyphens and dots", () => {
    expect(safeFilename(".hidden", "pdf")).toBe("hidden.pdf");
    expect(safeFilename("-name-", "pdf")).toBe("name.pdf");
    expect(safeFilename("name...", "pdf")).toBe("name.pdf");
    expect(safeFilename(" .-. name .-. ", "pdf")).toBe("name.pdf");
  });

  it("keeps internal dots", () => {
    expect(safeFilename("v1.2 final", "pdf")).toBe("v1.2-final.pdf");
  });

  it("preserves case and non-ASCII characters", () => {
    expect(safeFilename("Zoë Müller 履歴書", "pdf")).toBe("Zoë-Müller-履歴書.pdf");
  });

  it.each(["", "   ", "...", "---", "/:*?", " . - / "])(
    "falls back to 'resume' when nothing usable remains (%j)",
    (raw) => {
      expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
    },
  );

  it("uses the extension verbatim", () => {
    expect(safeFilename("cv", "docx")).toBe("cv.docx");
    expect(safeFilename("cv", "tar.gz")).toBe("cv.tar.gz");
  });
});
