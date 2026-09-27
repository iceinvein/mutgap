import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("plain names", () => {
    it("returns names that are neither paths nor dash-encoded unchanged", () => {
      expect(normalizeProjectName("my-app")).toBe("my-app");
      expect(normalizeProjectName("owner/repo")).toBe("owner/repo");
      expect(normalizeProjectName("")).toBe("");
    });
  });

  describe("absolute paths", () => {
    it.each(["workspace", "src", "projects", "repos", "code"])(
      "returns the path after the %s marker",
      (marker) => {
        expect(normalizeProjectName(`/home/me/${marker}/org/app`)).toBe("org/app");
      },
    );

    it("returns a single segment after a marker", () => {
      expect(normalizeProjectName("/Users/me/code/app")).toBe("app");
    });

    it("collapses a duplicated trailing segment", () => {
      expect(normalizeProjectName("/Users/me/repos/app/app")).toBe("app");
      expect(normalizeProjectName("/Users/me/repos/org/app/app")).toBe("app");
    });

    it("keeps distinct trailing segments", () => {
      expect(normalizeProjectName("/Users/me/repos/app/app/lib")).toBe("app/app/lib");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/code/old/code/app")).toBe("app");
    });

    it("checks markers in priority order rather than path order", () => {
      expect(normalizeProjectName("/home/workspace/proj/src/app")).toBe("proj/src/app");
    });

    it("ignores empty segments from repeated or trailing slashes", () => {
      expect(normalizeProjectName("//home//me/code//app/")).toBe("app");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/home/me/stuff/app")).toBe("stuff/app");
      expect(normalizeProjectName("/app")).toBe("app");
    });

    it("returns the input when the path has no segments", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });
  });

  describe("dash-encoded paths", () => {
    it.each(["workspace", "src", "projects", "repos", "code"])(
      "returns the segments after the %s marker",
      (marker) => {
        expect(normalizeProjectName(`-home-me-${marker}-my-app`)).toBe("my-app");
      },
    );

    it("collapses exactly two identical trailing segments", () => {
      expect(normalizeProjectName("-Users-me-code-app-app")).toBe("app");
    });

    it("does not collapse duplicates when more than two segments follow the marker", () => {
      expect(normalizeProjectName("-Users-me-code-org-app-app")).toBe("org-app-app");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("-code-old-code-app")).toBe("app");
    });

    it("skips a marker that is the final segment", () => {
      expect(normalizeProjectName("-Users-me-code")).toBe("Users-me-code");
      expect(normalizeProjectName("-home-src-proj-code")).toBe("proj-code");
    });

    it("ignores empty segments from repeated dashes", () => {
      expect(normalizeProjectName("--home--me-code--my--app-")).toBe("my-app");
    });

    it("rejoins all segments when no marker is present", () => {
      expect(normalizeProjectName("-home-me-app")).toBe("home-me-app");
    });

    it("collapses two identical segments when no marker is present", () => {
      expect(normalizeProjectName("-app-app")).toBe("app");
    });

    it("returns the input when it contains only dashes", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
