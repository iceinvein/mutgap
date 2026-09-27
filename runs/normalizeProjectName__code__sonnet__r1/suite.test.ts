import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  it("returns plain names unchanged", () => {
    expect(normalizeProjectName("my-project")).toBe("my-project");
    expect(normalizeProjectName("myproject")).toBe("myproject");
  });

  describe("absolute paths", () => {
    it("returns the tail after a marker segment", () => {
      expect(normalizeProjectName("/workspace/foo")).toBe("foo");
    });

    it("collapses a duplicated trailing tail segment", () => {
      expect(normalizeProjectName("/workspace/foo/foo")).toBe("foo");
      expect(normalizeProjectName("/a/workspace/x/x")).toBe("x");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/workspace/a/workspace/b")).toBe("b");
    });

    it("prefers earlier markers in the marker priority list", () => {
      expect(normalizeProjectName("/src/workspace/app")).toBe("app");
    });

    it("matches other markers such as repos", () => {
      expect(normalizeProjectName("/repos/myapp")).toBe("myapp");
    });

    it("returns an empty string when the marker is the last segment", () => {
      expect(normalizeProjectName("/a/b/workspace")).toBe("");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/foo/bar/baz")).toBe("bar/baz");
    });

    it("falls back to the single segment when only one part is present", () => {
      expect(normalizeProjectName("/foo")).toBe("foo");
    });

    it("returns the original string for the root path", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });

    it("ignores empty segments from repeated slashes", () => {
      expect(normalizeProjectName("/workspace//foo")).toBe("foo");
    });
  });

  describe("dash-prefixed names", () => {
    it("returns the tail after a marker segment", () => {
      expect(normalizeProjectName("-workspace-foo")).toBe("foo");
    });

    it("collapses a duplicated trailing tail segment", () => {
      expect(normalizeProjectName("-workspace-foo-foo")).toBe("foo");
    });

    it("prefers earlier markers in the marker priority list", () => {
      expect(normalizeProjectName("-src-workspace-app")).toBe("app");
    });

    it("does not match a marker that is the last segment", () => {
      expect(normalizeProjectName("-foo-workspace")).toBe("foo-workspace");
    });

    it("collapses duplicated segments when no marker is present", () => {
      expect(normalizeProjectName("-foo-foo")).toBe("foo");
    });

    it("joins remaining segments with a dash when no marker matches and no duplication", () => {
      expect(normalizeProjectName("-foo-bar")).toBe("foo-bar");
      expect(normalizeProjectName("-a-b-c")).toBe("a-b-c");
    });

    it("returns the original string when there are no non-empty segments", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
