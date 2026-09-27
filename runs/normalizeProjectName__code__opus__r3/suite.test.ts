import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("plain names", () => {
    it("returns names that start with neither '/' nor '-' unchanged", () => {
      expect(normalizeProjectName("my-project")).toBe("my-project");
      expect(normalizeProjectName("foo/bar")).toBe("foo/bar");
      expect(normalizeProjectName("")).toBe("");
    });
  });

  describe("absolute paths", () => {
    it("returns the path after a marker directory", () => {
      expect(normalizeProjectName("/Users/me/code/app")).toBe("app");
      expect(normalizeProjectName("/home/me/workspace/org/app")).toBe("org/app");
    });

    it("recognises every marker directory", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`/home/me/${marker}/app`)).toBe("app");
      }
    });

    it("collapses a trailing duplicated segment", () => {
      expect(normalizeProjectName("/home/me/repos/app/app")).toBe("app");
      expect(normalizeProjectName("/home/me/repos/org/app/app")).toBe("app");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/code/me/code/app")).toBe("app");
    });

    it("checks markers in priority order rather than by position", () => {
      // "src" is checked before "code", so it wins even though it appears earlier.
      expect(normalizeProjectName("/home/src/code/app")).toBe("code/app");
    });

    it("ignores repeated and trailing slashes", () => {
      expect(normalizeProjectName("//home//me/code//app/")).toBe("app");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/home/me/app")).toBe("me/app");
      expect(normalizeProjectName("/app")).toBe("app");
    });

    it("returns the input when the path has no segments", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });
  });

  describe("dash-encoded paths", () => {
    it("returns the part after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-app")).toBe("app");
    });

    it("recognises every marker", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`-home-me-${marker}-app`)).toBe("app");
      }
    });

    it("keeps hyphenated names after a marker joined with '-'", () => {
      expect(normalizeProjectName("-Users-me-code-my-app")).toBe("my-app");
    });

    it("collapses exactly two identical parts after a marker", () => {
      expect(normalizeProjectName("-Users-me-repos-app-app")).toBe("app");
      expect(normalizeProjectName("-Users-me-repos-org-app-app")).toBe("org-app-app");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("-code-me-code-app")).toBe("app");
    });

    it("checks markers in priority order rather than by position", () => {
      expect(normalizeProjectName("-home-src-code-app")).toBe("code-app");
    });

    it("ignores a marker that is the final part", () => {
      expect(normalizeProjectName("-home-me-code")).toBe("home-me-code");
    });

    it("ignores empty parts from repeated dashes", () => {
      expect(normalizeProjectName("--Users--me-code--app-")).toBe("app");
    });

    it("joins all parts when no marker is present", () => {
      expect(normalizeProjectName("-Users-me-app")).toBe("Users-me-app");
    });

    it("collapses two identical parts when no marker is present", () => {
      expect(normalizeProjectName("-app-app")).toBe("app");
    });

    it("returns the input when there are no parts", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
