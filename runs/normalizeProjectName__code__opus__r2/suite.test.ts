import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("plain names", () => {
    it.each([
      ["my-project", "my-project"],
      ["myproject", "myproject"],
      ["org/repo", "org/repo"],
      ["relative/path/to/thing", "relative/path/to/thing"],
      ["", ""],
    ])("returns %j unchanged", (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected);
    });
  });

  describe("absolute paths", () => {
    it.each([
      ["/Users/me/code/myproj", "myproj"],
      ["/home/me/workspace/myproj", "myproj"],
      ["/home/me/src/myproj", "myproj"],
      ["/home/me/projects/myproj", "myproj"],
      ["/home/me/repos/myproj", "myproj"],
    ])("returns the path after a marker directory: %s", (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected);
    });

    it("keeps nested segments after the marker", () => {
      expect(normalizeProjectName("/home/me/code/org/myproj")).toBe("org/myproj");
    });

    it("ignores trailing and repeated slashes", () => {
      expect(normalizeProjectName("/home//me/code/myproj/")).toBe("myproj");
    });

    it("collapses a duplicated final segment", () => {
      expect(normalizeProjectName("/home/me/code/myproj/myproj")).toBe("myproj");
    });

    it("collapses a duplicated final segment even with preceding segments", () => {
      expect(normalizeProjectName("/home/me/code/org/myproj/myproj")).toBe("myproj");
    });

    it("does not collapse non-adjacent duplicates", () => {
      expect(normalizeProjectName("/home/me/code/myproj/lib/myproj")).toBe(
        "myproj/lib/myproj",
      );
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/code/a/code/b")).toBe("b");
    });

    it("prefers markers by list order, not by position in the path", () => {
      // "workspace" is checked before "src", so it wins even though "src" is deeper.
      expect(normalizeProjectName("/home/workspace/app/src/lib")).toBe("app/src/lib");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/home/me/myproj")).toBe("me/myproj");
    });

    it("returns the single segment when only one exists", () => {
      expect(normalizeProjectName("/myproj")).toBe("myproj");
    });

    it("returns the input for the root path", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });

    it("returns an empty string when the marker is the last segment (current behavior)", () => {
      // Unlike the dash-encoded branch, a trailing marker is not skipped here.
      expect(normalizeProjectName("/home/me/code")).toBe("");
    });
  });

  describe("dash-encoded paths", () => {
    it.each([
      ["-Users-me-code-myproj", "myproj"],
      ["-home-me-workspace-myproj", "myproj"],
      ["-home-me-src-myproj", "myproj"],
      ["-home-me-projects-myproj", "myproj"],
      ["-home-me-repos-myproj", "myproj"],
    ])("returns the segments after a marker: %s", (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected);
    });

    it("rejoins multiple segments after the marker with dashes", () => {
      expect(normalizeProjectName("-Users-me-code-my-proj")).toBe("my-proj");
    });

    it("collapses exactly two identical segments after the marker", () => {
      expect(normalizeProjectName("-Users-me-code-myproj-myproj")).toBe("myproj");
    });

    it("does not collapse three identical segments after the marker", () => {
      expect(normalizeProjectName("-Users-me-code-a-a-a")).toBe("a-a-a");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("-code-a-code-b")).toBe("b");
    });

    it("skips a marker in the last position and tries the next marker", () => {
      expect(normalizeProjectName("-home-src-app-code")).toBe("app-code");
    });

    it("returns all segments joined when the only marker is last", () => {
      expect(normalizeProjectName("-Users-me-code")).toBe("Users-me-code");
    });

    it("returns all segments joined when there is no marker", () => {
      expect(normalizeProjectName("-home-me-myproj")).toBe("home-me-myproj");
    });

    it("collapses consecutive dashes", () => {
      expect(normalizeProjectName("--home--me--myproj-")).toBe("home-me-myproj");
    });

    it("collapses two identical segments without a marker", () => {
      expect(normalizeProjectName("-myproj-myproj")).toBe("myproj");
    });

    it("does not collapse two different segments without a marker", () => {
      expect(normalizeProjectName("-foo-bar")).toBe("foo-bar");
    });

    it("returns the input when it contains only dashes", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
