import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("absolute paths", () => {
    it("takes the segments after a marker", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
      expect(normalizeProjectName("/home/me/projects/app")).toBe("app");
    });

    it("collapses identical last two segments after a marker", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
      expect(normalizeProjectName("/home/me/code/org/api/api")).toBe("api");
    });

    it("does not collapse when the last two segments differ", () => {
      expect(normalizeProjectName("/home/me/code/api/api/web")).toBe("api/api/web");
    });

    it("recognises every marker", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`/x/${marker}/app`)).toBe("app");
      }
    });

    it("tries markers in priority order, not path order", () => {
      expect(normalizeProjectName("/workspace/a/src/b")).toBe("a/src/b");
      expect(normalizeProjectName("/src/a/workspace/b")).toBe("b");
      expect(normalizeProjectName("/code/a/repos/b")).toBe("b");
    });

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/src/a/src/b")).toBe("b");
    });

    it("drops empty segments", () => {
      expect(normalizeProjectName("//home//me/code//acme///web/")).toBe("acme/web");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
      expect(normalizeProjectName("/opt")).toBe("opt");
    });

    it("does not count a marker that is the final segment", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
      expect(normalizeProjectName("/code")).toBe("code");
    });

    it("moves on to the next marker when an earlier one is the final segment", () => {
      expect(normalizeProjectName("/home/code/app/src")).toBe("app/src");
    });

    it("returns the input unchanged when there are no segments", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });

    it("matches markers exactly", () => {
      expect(normalizeProjectName("/home/Code/sources/app")).toBe("sources/app");
    });
  });

  describe("dash-encoded paths", () => {
    it("takes the pieces after a marker, joined with dashes", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe("my-app");
      expect(normalizeProjectName("-Users-me-code-app")).toBe("app");
    });

    it("collapses exactly two identical pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-api-api")).toBe("api");
    });

    it("does not collapse when there are more than two pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-org-api-api")).toBe("org-api-api");
    });

    it("recognises every marker", () => {
      for (const marker of ["workspace", "src", "projects", "repos", "code"]) {
        expect(normalizeProjectName(`-x-${marker}-app`)).toBe("app");
      }
    });

    it("tries markers in priority order and uses the last occurrence", () => {
      expect(normalizeProjectName("-workspace-a-src-b")).toBe("a-src-b");
      expect(normalizeProjectName("-src-a-src-b")).toBe("b");
    });

    it("does not count a marker that is the final piece", () => {
      expect(normalizeProjectName("-home-me-projects")).toBe("home-me-projects");
      expect(normalizeProjectName("-home-code-app-src")).toBe("app-src");
    });

    it("drops empty pieces", () => {
      expect(normalizeProjectName("-Users--me-code--my---app-")).toBe("my-app");
    });

    it("joins all pieces without the leading dash when no marker counts", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
      expect(normalizeProjectName("-tmp")).toBe("tmp");
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(normalizeProjectName("-app-app")).toBe("app");
      expect(normalizeProjectName("-x-app-app")).toBe("x-app-app");
    });

    it("returns the input unchanged when there are no pieces", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });

  describe("other inputs", () => {
    it("returns the input unchanged", () => {
      expect(normalizeProjectName("my-project")).toBe("my-project");
      expect(normalizeProjectName("code/app")).toBe("code/app");
      expect(normalizeProjectName("C:\\code\\app")).toBe("C:\\code\\app");
      expect(normalizeProjectName("")).toBe("");
    });
  });
});
