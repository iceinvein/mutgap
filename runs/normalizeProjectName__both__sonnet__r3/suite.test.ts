import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("anything else (not / or - prefixed)", () => {
    it("returns a plain name unchanged", () => {
      expect(normalizeProjectName("myproject")).toBe("myproject");
    });

    it("returns an empty string unchanged", () => {
      expect(normalizeProjectName("")).toBe("");
    });

    it("returns an arbitrary string unchanged", () => {
      expect(normalizeProjectName("my_project.name")).toBe("my_project.name");
    });
  });

  describe("absolute paths", () => {
    it("returns the single segment when the tail's last two segments are identical", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
    });

    it("joins the tail with / when the last two segments differ", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
    });

    it("does not count a marker that is the final segment, falling back to the last two segments", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
    });

    it("returns the input unchanged when the fallback result would be empty", () => {
      expect(normalizeProjectName("/")).toBe("/");
    });

    it("keeps a single segment when there is only one and no marker", () => {
      expect(normalizeProjectName("/onlyone")).toBe("onlyone");
    });

    it("prefers an earlier marker in the fixed order over a later one that appears later in the path", () => {
      expect(normalizeProjectName("/home/src/foo/code/bar")).toBe(
        "foo/code/bar",
      );
    });

    it("uses the last occurrence of the winning marker", () => {
      expect(normalizeProjectName("/a/src/b/src/c")).toBe("c");
    });
  });

  describe("dash-encoded paths", () => {
    it("returns the single piece when the marker's tail is exactly two identical pieces", () => {
      expect(normalizeProjectName("-Users-me-projects-app-app")).toBe("app");
    });

    it("joins the marker's tail with - when the two pieces differ", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe(
        "my-app",
      );
    });

    it("joins a single-piece tail as-is", () => {
      expect(normalizeProjectName("-Users-me-src-app")).toBe("app");
    });

    it("joins a three-piece tail with -, without deduping the last two", () => {
      expect(normalizeProjectName("-a-b-src-x-y-y")).toBe("x-y-y");
    });

    it("does not count a marker that is the final piece, falling back to joining all pieces", () => {
      expect(normalizeProjectName("-Users-me-projects")).toBe(
        "Users-me-projects",
      );
    });

    it("returns the single piece when there is no marker and exactly two identical pieces remain", () => {
      expect(normalizeProjectName("-app-app")).toBe("app");
    });

    it("joins all pieces with - when there is no marker, dropping the leading dash", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
    });

    it("returns the input unchanged when nothing is left after splitting on -", () => {
      expect(normalizeProjectName("-")).toBe("-");
    });

    it("prefers an earlier marker in the fixed order over a later one that appears later in the path", () => {
      expect(normalizeProjectName("-Users-src-foo-code-bar")).toBe(
        "foo-code-bar",
      );
    });

    it("uses the last occurrence of the winning marker", () => {
      expect(normalizeProjectName("-a-src-b-src-c")).toBe("c");
    });
  });
});
