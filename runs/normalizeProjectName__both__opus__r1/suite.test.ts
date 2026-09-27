import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("other inputs", () => {
    it.each(["my-app", "", "foo/bar", "relative/code/app", "C:\\code\\app"])(
      "returns %j unchanged",
      (input) => {
        expect(normalizeProjectName(input)).toBe(input);
      },
    );
  });

  describe("absolute paths", () => {
    it("joins segments after a marker with /", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
    });

    it("returns the single segment after a marker", () => {
      expect(normalizeProjectName("/home/me/projects/api")).toBe("api");
    });

    it("collapses identical last two segments after a marker", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
      expect(normalizeProjectName("/code/org/api/api")).toBe("api");
    });

    it("does not collapse when the last two segments differ", () => {
      expect(normalizeProjectName("/code/api/api/web")).toBe("api/api/web");
    });

    it("recognises every marker", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`/x/${marker}/a/b`)).toBe("a/b");
      }
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/code/a/code/b")).toBe("b");
    });

    it("tries markers in priority order, not path order", () => {
      // workspace beats code even though code comes later in the path
      expect(normalizeProjectName("/workspace/a/code/b")).toBe("a/code/b");
      // src beats projects
      expect(normalizeProjectName("/projects/src/app")).toBe("app");
    });

    it("ignores empty segments from repeated or trailing slashes", () => {
      expect(normalizeProjectName("//home//me/code//acme/web/")).toBe(
        "acme/web",
      );
    });

    it("falls back to the last two segments when there is no marker", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
      expect(normalizeProjectName("/usr/local/lib/node")).toBe("lib/node");
    });

    it("falls back to the single segment when only one exists", () => {
      expect(normalizeProjectName("/tmp")).toBe("tmp");
    });

    it("does not count a marker that is the final segment", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
      expect(normalizeProjectName("/code")).toBe("code");
    });

    it("moves on to the next marker when a higher-priority one is final", () => {
      expect(normalizeProjectName("/home/code/app/src")).toBe("app/src");
    });

    it("does not collapse identical segments in the fallback", () => {
      expect(normalizeProjectName("/opt/api/api")).toBe("api/api");
    });

    it("returns the input when there are no segments", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });
  });

  describe("dash-encoded paths", () => {
    it("joins pieces after a marker with -", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe("my-app");
    });

    it("returns the single piece after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-api")).toBe("api");
    });

    it("collapses exactly two identical pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-api-api")).toBe("api");
    });

    it("does not collapse when more than two pieces follow the marker", () => {
      expect(normalizeProjectName("-Users-me-code-org-api-api")).toBe(
        "org-api-api",
      );
    });

    it("recognises every marker", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`-x-${marker}-a-b`)).toBe("a-b");
      }
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("-code-a-code-b")).toBe("b");
    });

    it("tries markers in priority order, not path order", () => {
      expect(normalizeProjectName("-workspace-a-code-b")).toBe("a-code-b");
    });

    it("does not count a marker that is the final piece", () => {
      expect(normalizeProjectName("-Users-me-projects")).toBe(
        "Users-me-projects",
      );
      expect(normalizeProjectName("-home-code-app-src")).toBe("app-src");
    });

    it("ignores empty pieces", () => {
      expect(normalizeProjectName("--Users--me-code--my-app-")).toBe("my-app");
    });

    it("joins all pieces when there is no marker, dropping the leading dash", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
      expect(normalizeProjectName("-opt-tools-bin")).toBe("opt-tools-bin");
    });

    it("collapses exactly two identical pieces when there is no marker", () => {
      expect(normalizeProjectName("-api-api")).toBe("api");
    });

    it("does not collapse identical pieces when there are more than two", () => {
      expect(normalizeProjectName("-x-api-api")).toBe("x-api-api");
    });

    it("returns the input when there are no pieces", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
