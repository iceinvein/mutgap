import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

describe("resolveAppRoute", () => {
  it("returns editor mode when nothing indicates a resume", () => {
    expect(resolveAppRoute(loc({}))).toEqual({ mode: "editor" });
  });

  describe("hash-based routing", () => {
    it("resolves a bare hash slug", () => {
      expect(resolveAppRoute(loc({ hash: "#jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("resolves a /resume/<slug> hash path", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("ignores a hash with unrelated multi-segment path", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/bar" }))).toEqual({ mode: "editor" });
    });

    it("normalizes case, whitespace, and .mdx suffix in hash slug", () => {
      expect(resolveAppRoute(loc({ hash: "#  Jane_Doe.MDX  " }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("treats an empty hash as absent", () => {
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual({ mode: "editor" });
    });

    it("takes precedence over query and path", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#hash-slug", search: "?resume=query-slug", pathname: "/resume/path-slug" })
        )
      ).toEqual({ mode: "shared-resume", slug: "hash-slug" });
    });
  });

  describe("query-based routing", () => {
    it("resolves ?resume=<slug>", () => {
      expect(resolveAppRoute(loc({ search: "?resume=jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("maps truthy sentinel values to the generic 'resume' slug", () => {
      for (const value of ["1", "true", "shared"]) {
        expect(resolveAppRoute(loc({ search: `?resume=${value}` }))).toEqual({
          mode: "shared-resume",
          slug: "resume",
        });
      }
    });

    it("ignores an empty resume query value", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({ mode: "editor" });
    });

    it("ignores unrelated query params", () => {
      expect(resolveAppRoute(loc({ search: "?foo=bar" }))).toEqual({ mode: "editor" });
    });

    it("takes precedence over path when hash is absent", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=query-slug", pathname: "/resume/path-slug" }))
      ).toEqual({ mode: "shared-resume", slug: "query-slug" });
    });
  });

  describe("path-based routing", () => {
    it("resolves /resume/<slug>", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("resolves a bare /resume path to the generic slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("resolves nested paths ending in /resume/<slug>", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("ignores paths that don't reference resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/foo/bar" }))).toEqual({ mode: "editor" });
    });

    it("ignores the root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({ mode: "editor" });
    });
  });
});
