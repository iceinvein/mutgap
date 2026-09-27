import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("plain names (no leading '/' or '-')", () => {
    it("returns the name unchanged", () => {
      expect(normalizeProjectName("myproject")).toBe("myproject");
    });

    it("returns an empty string unchanged", () => {
      expect(normalizeProjectName("")).toBe("");
    });
  });

  describe("absolute paths", () => {
    it("returns the single segment after a marker", () => {
      expect(normalizeProjectName("/home/user/workspace/foo")).toBe("foo");
    });

    it("joins multiple segments after a marker with '/'", () => {
      expect(normalizeProjectName("/a/src/b/c")).toBe("b/c");
    });

    it("collapses a duplicated final pair after a marker", () => {
      expect(normalizeProjectName("/home/workspace/foo/foo")).toBe("foo");
    });

    it("collapses only the last two segments even when the tail is longer", () => {
      expect(normalizeProjectName("/workspace/a/dup/dup")).toBe("dup");
    });

    it("prefers earlier markers in the markers list over ones that appear later in the path", () => {
      expect(normalizeProjectName("/a/workspace/b/src/c")).toBe("b/src/c");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/a/b/c/d")).toBe("c/d");
    });

    it("returns a single remaining segment when no marker is present", () => {
      expect(normalizeProjectName("/foo")).toBe("foo");
    });

    it("falls back to the original string for the root path", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });
  });

  describe("dash-delimited names", () => {
    it("joins the single segment after a marker", () => {
      expect(normalizeProjectName("-home-workspace-foo")).toBe("foo");
    });

    it("collapses a duplicated pair immediately after a marker", () => {
      expect(normalizeProjectName("-workspace-foo-foo")).toBe("foo");
    });

    it("does not collapse when the tail after a marker has more than two segments, even if the last two match", () => {
      expect(normalizeProjectName("-workspace-a-dup-dup")).toBe("a-dup-dup");
    });

    it("ignores a marker that is the last segment", () => {
      expect(normalizeProjectName("-foo-workspace")).toBe("foo-workspace");
    });

    it("collapses a duplicated pair when no marker is present", () => {
      expect(normalizeProjectName("-foo-foo")).toBe("foo");
    });

    it("joins segments with '-' when no marker and no duplicate pair", () => {
      expect(normalizeProjectName("-foo-bar-baz")).toBe("foo-bar-baz");
    });

    it("returns the original string when it has no non-dash segments", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
