import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(overrides: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...overrides };
}

describe("resolveAppRoute", () => {
  it("returns editor mode when there is no route information", () => {
    expect(resolveAppRoute(loc({}))).toEqual({ mode: "editor" });
  });

  describe("hash-based routing", () => {
    it("resolves a bare hash slug", () => {
      expect(resolveAppRoute(loc({ hash: "#my-resume" }))).toEqual({
        mode: "shared-resume",
        slug: "my-resume",
      });
    });

    it("resolves a /resume/<slug> hash path", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("ignores a hash with an unrecognized first segment and more than one segment", () => {
      expect(resolveAppRoute(loc({ hash: "#/other/jane-doe" }))).toEqual({
        mode: "editor",
      });
    });

    it("treats an empty hash as absent", () => {
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual({ mode: "editor" });
    });

    it("normalizes slug casing, extension, and separators in the hash", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/Jane_Doe.MDX" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("takes precedence over query and path slugs", () => {
      expect(
        resolveAppRoute(
          loc({
            hash: "#hash-slug",
            search: "?resume=query-slug",
            pathname: "/resume/path-slug",
          }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "hash-slug" });
    });
  });

  describe("query-based routing", () => {
    it("resolves a resume query param", () => {
      expect(resolveAppRoute(loc({ search: "?resume=jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("treats resume=1 as a bare resume route", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("treats resume=true as a bare resume route", () => {
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("treats resume=shared as a bare resume route", () => {
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("ignores an empty resume query param", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({
        mode: "editor",
      });
    });

    it("ignores an absent resume query param", () => {
      expect(resolveAppRoute(loc({ search: "?other=value" }))).toEqual({
        mode: "editor",
      });
    });

    it("takes precedence over the path slug", () => {
      expect(
        resolveAppRoute(
          loc({ search: "?resume=query-slug", pathname: "/resume/path-slug" }),
        ),
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

    it("resolves a bare /resume path", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("handles trailing slashes", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/jane-doe/" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("ignores paths without a resume segment", () => {
      expect(resolveAppRoute(loc({ pathname: "/about" }))).toEqual({
        mode: "editor",
      });
    });

    it("ignores the root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({
        mode: "editor",
      });
    });

    it("normalizes slug casing, extension, and separators in the path", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" })),
      ).toEqual({ mode: "shared-resume", slug: "jane-doe" });
    });
  });

  describe("slug normalization", () => {
    it("strips characters outside a-z0-9- and collapses dashes", () => {
      expect(
        resolveAppRoute(loc({ hash: "#  Jane!!__Doe--2024  " })),
      ).toEqual({ mode: "shared-resume", slug: "jane-doe-2024" });
    });

    it("returns editor mode if normalization empties the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#!!!" }))).toEqual({
        mode: "editor",
      });
    });
  });
});
