import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(overrides: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...overrides };
}

const editor = { mode: "editor" } as const;
const shared = (slug: string) => ({ mode: "shared-resume", slug }) as const;

describe("resolveAppRoute", () => {
  describe("editor mode", () => {
    it("returns editor for the root location", () => {
      expect(resolveAppRoute(loc())).toEqual(editor);
    });

    it("returns editor for unrelated paths", () => {
      expect(resolveAppRoute(loc({ pathname: "/about" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ pathname: "/foo/bar" }))).toEqual(editor);
    });

    it("returns editor for unrelated query params", () => {
      expect(resolveAppRoute(loc({ search: "?foo=bar" }))).toEqual(editor);
    });

    it("returns editor for empty or slash-only hashes", () => {
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ hash: "#/" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ hash: "#///" }))).toEqual(editor);
    });
  });

  describe("hash routing", () => {
    it("uses a single-segment hash as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#jane-doe" }))).toEqual(shared("jane-doe"));
      expect(resolveAppRoute(loc({ hash: "#/jane-doe/" }))).toEqual(shared("jane-doe"));
    });

    it("treats a bare #resume as the default resume slug", () => {
      expect(resolveAppRoute(loc({ hash: "#resume" }))).toEqual(shared("resume"));
      expect(resolveAppRoute(loc({ hash: "#/resume" }))).toEqual(shared("resume"));
    });

    it("reads the slug after a resume/ prefix", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/jane-doe" }))).toEqual(shared("jane-doe"));
      expect(resolveAppRoute(loc({ hash: "#resume/jane-doe/extra" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("ignores multi-segment hashes without a resume prefix", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/bar" }))).toEqual(editor);
    });

    it("normalizes hash segments", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/Jane_Doe.mdx" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("drops segments that normalize to empty before counting", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/jane" }))).toEqual(shared("jane"));
      expect(resolveAppRoute(loc({ hash: "#/!!!" }))).toEqual(editor);
    });

    it("takes precedence over query and path", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#from-hash", search: "?resume=from-query", pathname: "/resume/from-path" }),
        ),
      ).toEqual(shared("from-hash"));
    });

    it("falls through to query/path when the hash yields no slug", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/foo/bar", search: "?resume=from-query" })),
      ).toEqual(shared("from-query"));
      expect(resolveAppRoute(loc({ hash: "#/foo/bar", pathname: "/resume/from-path" }))).toEqual(
        shared("from-path"),
      );
    });
  });

  describe("query routing", () => {
    it("uses the resume param as the slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("works without a leading question mark and with other params", () => {
      expect(resolveAppRoute(loc({ search: "resume=jane" }))).toEqual(shared("jane"));
      expect(resolveAppRoute(loc({ search: "?a=1&resume=jane&b=2" }))).toEqual(shared("jane"));
    });

    it.each(["1", "true", "TRUE", "shared", "Shared"])(
      "maps flag value %j to the default resume slug",
      (value) => {
        expect(resolveAppRoute(loc({ search: `?resume=${value}` }))).toEqual(shared("resume"));
      },
    );

    it("maps values that normalize to empty to the default resume slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=!!!" }))).toEqual(shared("resume"));
      expect(resolveAppRoute(loc({ search: "?resume=%20" }))).toEqual(shared("resume"));
    });

    it("ignores an empty resume param", () => {
      expect(resolveAppRoute(loc({ search: "?resume" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual(editor);
    });

    it("normalizes the value, including URL-decoded characters", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Jane%20Doe.mdx" }))).toEqual(
        shared("jane-doe"),
      );
      expect(resolveAppRoute(loc({ search: "?resume=Jane+Doe" }))).toEqual(shared("jane-doe"));
    });

    it("takes precedence over the path", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=from-query", pathname: "/resume/from-path" })),
      ).toEqual(shared("from-query"));
    });

    it("falls through to the path when the param is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=", pathname: "/resume/from-path" }))).toEqual(
        shared("from-path"),
      );
    });
  });

  describe("path routing", () => {
    it("treats a trailing /resume segment as the default resume slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual(shared("resume"));
      expect(resolveAppRoute(loc({ pathname: "/app/resume/" }))).toEqual(shared("resume"));
    });

    it("reads the segment following /resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane-doe" }))).toEqual(shared("jane-doe"));
      expect(resolveAppRoute(loc({ pathname: "/base/resume/jane-doe/" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("only considers the last two segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane/extra" }))).toEqual(editor);
    });

    it("normalizes path segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/Resume/Jane Doe.MDX" }))).toEqual(
        shared("jane-doe"),
      );
    });
  });

  describe("slug normalization", () => {
    it.each([
      ["  Jane  ", "jane"],
      ["Jane_Doe", "jane-doe"],
      ["jane__doe", "jane-doe"],
      ["jane---doe", "jane-doe"],
      ["-jane-doe-", "jane-doe"],
      ["jane.doe", "janedoe"],
      ["Jane-Doe.mdx", "jane-doe"],
      ["jane.mdx.mdx", "janemdx"],
      ["café-2024", "caf-2024"],
    ])("normalizes %j to %j", (input, expected) => {
      expect(
        resolveAppRoute(loc({ search: `?resume=${encodeURIComponent(input)}` })),
      ).toEqual(shared(expected));
    });
  });
});
