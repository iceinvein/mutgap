import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  it("returns plain names unchanged", () => {
    expect(normalizeProjectName("myproject")).toBe("myproject");
  });

  it("returns empty string unchanged", () => {
    expect(normalizeProjectName("")).toBe("");
  });

  describe("paths starting with /", () => {
    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/Users/dik/Documents/myproj")).toBe(
        "Documents/myproj",
      );
    });

    it("returns everything after a known marker", () => {
      expect(normalizeProjectName("/home/user/workspace/myapp")).toBe(
        "myapp",
      );
    });

    it("collapses a duplicated trailing segment after a marker", () => {
      expect(normalizeProjectName("/home/workspace/foo/foo")).toBe("foo");
    });

    it("prefers earlier markers in the markers list over ones that occur earlier in the path", () => {
      expect(normalizeProjectName("/repo/src/workspace/pkg")).toBe("pkg");
    });

    it("returns an empty string when the marker is the last path segment", () => {
      expect(normalizeProjectName("/a/b/workspace")).toBe("");
    });

    it("returns the single remaining segment when the path is short", () => {
      expect(normalizeProjectName("/myproj")).toBe("myproj");
    });

    it("falls back to the original string when nothing else can be produced", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });
  });

  describe("names starting with -", () => {
    it("joins remaining parts when no marker is present", () => {
      expect(normalizeProjectName("-myproject")).toBe("myproject");
    });

    it("returns everything after a known marker", () => {
      expect(normalizeProjectName("-Users-dik-workspace-myapp")).toBe(
        "myapp",
      );
    });

    it("collapses a duplicated trailing segment after a marker", () => {
      expect(normalizeProjectName("-Users-workspace-foo-foo")).toBe("foo");
    });

    it("ignores a marker that is the last segment and joins all parts instead", () => {
      expect(normalizeProjectName("-a-b-workspace")).toBe("a-b-workspace");
    });

    it("collapses a duplicated pair when there is no marker", () => {
      expect(normalizeProjectName("-foo-foo")).toBe("foo");
    });

    it("returns the original string when it contains no parts", () => {
      expect(normalizeProjectName("-")).toBe("-");
    });
  });
});
