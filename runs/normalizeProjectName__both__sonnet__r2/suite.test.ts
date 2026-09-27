import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("unrecognized shapes are returned unchanged", () => {
    it("returns a plain name unchanged", () => {
      expect(normalizeProjectName("myproject")).toBe("myproject");
    });

    it("returns a relative path unchanged", () => {
      expect(normalizeProjectName("foo/bar")).toBe("foo/bar");
    });

    it("returns an empty string unchanged", () => {
      expect(normalizeProjectName("")).toBe("");
    });
  });

  describe("absolute paths", () => {
    it("collapses identical trailing segments after a marker to one", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
    });

    it("joins distinct trailing segments after a marker with /", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
    });

    it("does not count a marker that is the final segment", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
    });

    it("returns the input unchanged when the fallback is empty", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });

    it("prefers earlier markers in priority order over later ones", () => {
      expect(normalizeProjectName("/a/workspace/b/src/c")).toBe("b/src/c");
    });

    it("skips a marker that only occurs as the final segment and uses the next one", () => {
      expect(normalizeProjectName("/a/projects/b/src")).toBe("b/src");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/x/src/y/src/z")).toBe("z");
    });

    it("joins whatever is available when fewer than two segments exist", () => {
      expect(normalizeProjectName("/home")).toBe("home");
    });

    it("returns a single trailing segment after a marker unchanged", () => {
      expect(normalizeProjectName("/home/user/workspace/foo")).toBe("foo");
    });
  });

  describe("dash-encoded paths", () => {
    it("returns the input unchanged when nothing is left after splitting", () => {
      expect(normalizeProjectName("-")).toBe("-");
    });

    it("collapses two identical trailing pieces after a marker to one", () => {
      expect(normalizeProjectName("-Users-me-code-api-api")).toBe("api");
    });

    it("joins distinct trailing pieces after a marker with -", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe(
        "my-app",
      );
    });

    it("drops the leading dash and joins remaining pieces when no marker counts", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(normalizeProjectName("-foo-foo")).toBe("foo");
    });

    it("does not count a marker that is the final piece", () => {
      expect(normalizeProjectName("-a-src")).toBe("a-src");
    });

    it("prefers earlier markers in priority order over later ones", () => {
      expect(normalizeProjectName("-workspace-x-src-y")).toBe("x-src-y");
    });

    it("returns the sole piece unchanged when the only marker is final", () => {
      expect(normalizeProjectName("-workspace")).toBe("workspace");
    });
  });
});
