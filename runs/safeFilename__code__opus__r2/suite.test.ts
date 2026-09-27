import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

describe("safeFilename", () => {
  it("appends the extension to a plain name", () => {
    expect(safeFilename("resume", "pdf")).toBe("resume.pdf");
  });

  it("trims surrounding whitespace", () => {
    expect(safeFilename("  Jane Doe  ", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("replaces internal whitespace runs (spaces, tabs, newlines) with a single hyphen", () => {
    expect(safeFilename("Jane \t\n Doe", "pdf")).toBe("Jane-Doe.pdf");
  });

  it("collapses repeated hyphens", () => {
    expect(safeFilename("Jane---Doe", "pdf")).toBe("Jane-Doe.pdf");
    expect(safeFilename("Jane - Doe", "pdf")).toBe("Jane-Doe.pdf");
  });

  it.each(["\\", "/", ":", "*", "?", '"', "<", ">", "|"])(
    "removes forbidden character %j",
    (ch) => {
      expect(safeFilename(`a${ch}b`, "txt")).toBe("ab.txt");
    },
  );

  it("strips path traversal sequences", () => {
    expect(safeFilename("../../etc/passwd", "txt")).toBe("etcpasswd.txt");
  });

  it("strips leading and trailing hyphens and dots", () => {
    expect(safeFilename("-.-name.-.", "pdf")).toBe("name.pdf");
    expect(safeFilename(".hidden", "pdf")).toBe("hidden.pdf");
  });

  it("preserves interior dots", () => {
    expect(safeFilename("v1.2 final", "pdf")).toBe("v1.2-final.pdf");
  });

  it("preserves non-ASCII characters", () => {
    expect(safeFilename("José Müller 履歴書", "pdf")).toBe("José-Müller-履歴書.pdf");
  });

  it.each(["", "   ", "...", "---", '<>:"/\\|?*', " - . - "])(
    "falls back to 'resume' when nothing usable remains (%j)",
    (raw) => {
      expect(safeFilename(raw, "pdf")).toBe("resume.pdf");
    },
  );

  it("uses the extension verbatim", () => {
    expect(safeFilename("doc", "tar.gz")).toBe("doc.tar.gz");
    expect(safeFilename("doc", "")).toBe("doc.");
  });
});
