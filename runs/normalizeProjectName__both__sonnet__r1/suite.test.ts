import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("plain strings (no leading / or -)", () => {
    it("returns the input unchanged", () => {
      expect(normalizeProjectName("myproject")).toBe("myproject");
    });

    it("returns an empty string unchanged", () => {
      expect(normalizeProjectName("")).toBe("");
    });
  });

  describe("absolute paths", () => {
    it("joins the segments after a marker that is not the final segment", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
    });

    it("collapses identical trailing segments to a single one", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
    });

    it("collapses identical trailing segments even with more segments before them", () => {
      expect(normalizeProjectName("/home/src/x/api/api")).toBe("api");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
    });

    it("falls back to the last two segments when the only marker is the final segment", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
    });

    it("returns the input unchanged when there are no segments at all", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });

    it("joins a single trailing segment after a marker on its own", () => {
      expect(normalizeProjectName("/a/workspace/foo")).toBe("foo");
    });

    it("uses the last occurrence of a marker when it appears more than once", () => {
      expect(normalizeProjectName("/a/src/b/src/c")).toBe("c");
    });

    it("picks the earliest marker in priority order regardless of position in the path", () => {
      expect(normalizeProjectName("/a/code/b/workspace/c")).toBe("c");
    });
  });

  describe("dash-encoded paths", () => {
    it("joins the pieces after a marker with a dash", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe(
        "my-app",
      );
    });

    it("collapses exactly two identical trailing pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-repos-app-app")).toBe("app");
    });

    it("does not collapse when the trailing pieces after a marker number more than two, even if the last two match", () => {
      expect(normalizeProjectName("-Users-me-projects-foo-bar-bar")).toBe(
        "foo-bar-bar",
      );
    });

    it("joins two distinct trailing pieces after a marker with a dash", () => {
      expect(normalizeProjectName("-Users-me-projects-foo-bar")).toBe(
        "foo-bar",
      );
    });

    it("does not count a marker that is the final piece", () => {
      expect(normalizeProjectName("-Users-me-code")).toBe("Users-me-code");
    });

    it("joins all pieces with a dash when no marker counts", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(normalizeProjectName("-app-app")).toBe("app");
    });

    it("returns the input unchanged when nothing is left after splitting", () => {
      expect(normalizeProjectName("---")).toBe("---");
    });

    it("returns a lone dash unchanged", () => {
      expect(normalizeProjectName("-")).toBe("-");
    });
  });
});
