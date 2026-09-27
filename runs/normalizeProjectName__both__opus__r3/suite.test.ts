import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./normalizeProjectName";

describe("normalizeProjectName", () => {
  describe("other inputs", () => {
    it.each(["my-app", "acme/web", "", "C:\\code\\app", " /leading-space"])(
      "returns %j unchanged",
      (input) => {
        expect(normalizeProjectName(input)).toBe(input);
      },
    );
  });

  describe("absolute paths", () => {
    it("joins the segments after a marker with /", () => {
      expect(normalizeProjectName("/home/me/code/acme/web")).toBe("acme/web");
    });

    it("collapses identical last two segments after a marker", () => {
      expect(normalizeProjectName("/home/me/code/api/api")).toBe("api");
      expect(normalizeProjectName("/home/me/code/acme/api/api")).toBe("api");
    });

    it("does not collapse when the last two segments differ", () => {
      expect(normalizeProjectName("/home/me/code/api/api/web")).toBe(
        "api/api/web",
      );
    });

    it("returns a single segment after a marker", () => {
      expect(normalizeProjectName("/home/me/repos/api")).toBe("api");
    });

    it.each(["workspace", "src", "projects", "repos", "code"])(
      "recognises the %s marker",
      (marker) => {
        expect(normalizeProjectName(`/x/y/${marker}/a/b`)).toBe("a/b");
      },
    );

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("/x/src/a/src/b")).toBe("b");
    });

    it("tries markers in priority order rather than path order", () => {
      // src is tried before code, even though code appears later in the path
      expect(normalizeProjectName("/x/src/a/code/b")).toBe("a/code/b");
      // workspace beats everything
      expect(normalizeProjectName("/code/a/workspace/b")).toBe("b");
    });

    it("skips a marker that is the final segment and tries the next one", () => {
      expect(normalizeProjectName("/x/projects/a/src")).toBe("a/src");
    });

    it("falls back to the last two segments when no marker is present", () => {
      expect(normalizeProjectName("/opt/tools/bin")).toBe("tools/bin");
    });

    it("falls back to the last two segments when the only marker is final", () => {
      expect(normalizeProjectName("/home/me/projects")).toBe("me/projects");
      expect(normalizeProjectName("/code")).toBe("code");
    });

    it("returns the single segment when there is only one", () => {
      expect(normalizeProjectName("/tmp")).toBe("tmp");
    });

    it("drops empty segments", () => {
      expect(normalizeProjectName("//home//me/code//acme/web/")).toBe(
        "acme/web",
      );
      expect(normalizeProjectName("/opt/tools/bin/")).toBe("tools/bin");
    });

    it("returns the input when there are no segments", () => {
      expect(normalizeProjectName("/")).toBe("/");
      expect(normalizeProjectName("///")).toBe("///");
    });

    it("matches markers exactly and case-sensitively", () => {
      expect(normalizeProjectName("/x/Code/a/b")).toBe("a/b");
      expect(normalizeProjectName("/x/mycode/a/b/c")).toBe("b/c");
    });
  });

  describe("dash-encoded paths", () => {
    it("joins the pieces after a marker with -", () => {
      expect(normalizeProjectName("-Users-me-projects-my-app")).toBe("my-app");
    });

    it("collapses exactly two identical pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-api-api")).toBe("api");
    });

    it("does not collapse when there are more than two pieces after a marker", () => {
      expect(normalizeProjectName("-Users-me-code-acme-api-api")).toBe(
        "acme-api-api",
      );
    });

    it("returns a single piece after a marker", () => {
      expect(normalizeProjectName("-Users-me-repos-api")).toBe("api");
    });

    it.each(["workspace", "src", "projects", "repos", "code"])(
      "recognises the %s marker",
      (marker) => {
        expect(normalizeProjectName(`-x-y-${marker}-a-b`)).toBe("a-b");
      },
    );

    it("uses the last occurrence of a marker", () => {
      expect(normalizeProjectName("-x-src-a-src-b")).toBe("b");
    });

    it("tries markers in priority order rather than path order", () => {
      expect(normalizeProjectName("-x-src-a-code-b")).toBe("a-code-b");
      expect(normalizeProjectName("-code-a-workspace-b")).toBe("b");
    });

    it("skips a marker that is the final piece and tries the next one", () => {
      expect(normalizeProjectName("-x-projects-a-src")).toBe("a-src");
    });

    it("joins all pieces when no marker is present, dropping the leading dash", () => {
      expect(normalizeProjectName("-tmp-scratch")).toBe("tmp-scratch");
      expect(normalizeProjectName("-opt-tools-bin")).toBe("opt-tools-bin");
    });

    it("joins all pieces when the only marker is final", () => {
      expect(normalizeProjectName("-Users-me-projects")).toBe(
        "Users-me-projects",
      );
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(normalizeProjectName("-foo-foo")).toBe("foo");
      expect(normalizeProjectName("-code-code")).toBe("code");
    });

    it("does not collapse identical pieces when there are not exactly two", () => {
      expect(normalizeProjectName("-a-foo-foo")).toBe("a-foo-foo");
    });

    it("drops empty pieces", () => {
      expect(normalizeProjectName("--Users--me-code--acme-web-")).toBe(
        "acme-web",
      );
      expect(normalizeProjectName("-tmp--scratch-")).toBe("tmp-scratch");
    });

    it("returns the input when there are no pieces", () => {
      expect(normalizeProjectName("-")).toBe("-");
      expect(normalizeProjectName("---")).toBe("---");
    });
  });
});
