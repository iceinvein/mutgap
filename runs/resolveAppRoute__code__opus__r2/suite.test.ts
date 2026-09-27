import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(parts: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...parts };
}

const editor = { mode: "editor" } as const;
const shared = (slug: string) => ({ mode: "shared-resume", slug }) as const;

describe("resolveAppRoute", () => {
  describe("editor mode", () => {
    it.each([
      ["root path", loc()],
      ["empty location", loc({ pathname: "" })],
      ["unrelated path", loc({ pathname: "/settings/profile" })],
      ["unrelated query param", loc({ search: "?foo=bar" })],
      ["empty resume query", loc({ search: "?resume=" })],
      ["bare hash", loc({ hash: "#" })],
      ["hash of only slashes", loc({ hash: "#///" })],
      ["hash of only symbols", loc({ hash: "#/!!!/" })],
    ])("returns editor for %s", (_label, location) => {
      expect(resolveAppRoute(location)).toEqual(editor);
    });
  });

  describe("hash routes", () => {
    it("uses a single hash segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("strips leading and trailing slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/jane-doe/" }))).toEqual(shared("jane-doe"));
    });

    it("uses the second segment of #/resume/<slug>", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("treats #/resume on its own as the 'resume' slug", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume" }))).toEqual(shared("resume"));
    });

    it("ignores multi-segment hashes not prefixed with resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/bar" }))).toEqual(editor);
    });

    it("normalizes the hash slug", () => {
      expect(resolveAppRoute(loc({ hash: "#/Resume/Jane_Doe.mdx" }))).toEqual(shared("jane-doe"));
    });

    it("drops segments that normalize to empty", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/jane" }))).toEqual(shared("jane"));
    });
  });

  describe("query routes", () => {
    it("uses the resume param value as the slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("works alongside other params", () => {
      expect(resolveAppRoute(loc({ search: "?a=1&resume=jane&b=2" }))).toEqual(shared("jane"));
    });

    it.each(["1", "true", "TRUE", "shared", "Shared"])(
      "maps flag value %s to the 'resume' slug",
      (value) => {
        expect(resolveAppRoute(loc({ search: `?resume=${value}` }))).toEqual(shared("resume"));
      },
    );

    it("maps a value that normalizes to empty to the 'resume' slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=!!!" }))).toEqual(shared("resume"));
    });

    it("decodes and normalizes the value", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Jane%20Doe.mdx" }))).toEqual(shared("jane-doe"));
    });
  });

  describe("path routes", () => {
    it("uses the segment after /resume/", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("supports a base path prefix", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/jane-doe/" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it.each(["/resume", "/resume/", "/app/resume"])(
      "treats %s as the 'resume' slug",
      (pathname) => {
        expect(resolveAppRoute(loc({ pathname }))).toEqual(shared("resume"));
      },
    );

    it("only matches the last two segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane/extra" }))).toEqual(editor);
    });

    it("normalizes path segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/RESUME/Jane_Doe.mdx" }))).toEqual(shared("jane-doe"));
    });
  });

  describe("precedence", () => {
    it("prefers hash over query and path", () => {
      expect(
        resolveAppRoute({ hash: "#from-hash", search: "?resume=from-query", pathname: "/resume/from-path" }),
      ).toEqual(shared("from-hash"));
    });

    it("prefers query over path", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=from-query", pathname: "/resume/from-path" })),
      ).toEqual(shared("from-query"));
    });

    it("falls through an unusable hash to the query", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/bar", search: "?resume=jane" }))).toEqual(
        shared("jane"),
      );
    });

    it("falls through to the path when hash and query are absent", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/bar", pathname: "/resume/jane" }))).toEqual(
        shared("jane"),
      );
    });
  });

  describe("slug normalization", () => {
    it.each([
      ["  Jane Doe  ", "jane-doe"],
      ["jane__doe", "jane-doe"],
      ["jane---doe", "jane-doe"],
      ["-jane-doe-", "jane-doe"],
      ["jane.doe!", "janedoe"],
      ["resume.MDX", "resume"],
      ["Résumé", "rsum"],
    ])("normalizes %j to %j", (input, expected) => {
      const search = `?${new URLSearchParams({ resume: input })}`;
      expect(resolveAppRoute(loc({ search }))).toEqual(shared(expected));
    });
  });
});
