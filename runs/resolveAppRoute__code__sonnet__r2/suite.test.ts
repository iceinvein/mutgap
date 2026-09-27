import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

describe("resolveAppRoute", () => {
  it("returns editor mode when nothing indicates a resume", () => {
    expect(resolveAppRoute(loc({}))).toEqual({ mode: "editor" });
    expect(resolveAppRoute(loc({ pathname: "/about" }))).toEqual({ mode: "editor" });
  });

  describe("hash-based slugs", () => {
    it("resolves a single hash segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#my-resume" }))).toEqual({
        mode: "shared-resume",
        slug: "my-resume",
      });
    });

    it("resolves #resume alone as the 'resume' slug", () => {
      expect(resolveAppRoute(loc({ hash: "#resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("resolves #/resume/<slug> to <slug>", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/jane-doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("ignores segments after the slug when the first segment is 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/a/b" }))).toEqual({
        mode: "shared-resume",
        slug: "a",
      });
    });

    it("falls through when a two-segment hash doesn't start with 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#foo/bar" }))).toEqual({ mode: "editor" });
    });

    it("normalizes case, spaces, underscores, and .mdx suffix", () => {
      expect(resolveAppRoute(loc({ hash: "#My_Resume Name.MDX" }))).toEqual({
        mode: "shared-resume",
        slug: "my-resume-name",
      });
    });

    it("treats an empty or slash-only hash as absent", () => {
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ hash: "#///" }))).toEqual({ mode: "editor" });
    });

    it("treats a hash that normalizes to nothing as absent", () => {
      expect(resolveAppRoute(loc({ hash: "#!!!" }))).toEqual({ mode: "editor" });
    });

    it("takes priority over query and path slugs", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#alice", search: "?resume=bob", pathname: "/resume/carol" }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });
  });

  describe("query-based slugs", () => {
    it("resolves ?resume=<slug> to the normalized slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=My-Slug" }))).toEqual({
        mode: "shared-resume",
        slug: "my-slug",
      });
    });

    it.each(["1", "true", "shared"])(
      "treats ?resume=%s as the plain 'resume' slug",
      (value) => {
        expect(resolveAppRoute(loc({ search: `?resume=${value}` }))).toEqual({
          mode: "shared-resume",
          slug: "resume",
        });
      },
    );

    it("ignores an empty ?resume= value and falls through to path/editor", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({ mode: "editor" });
    });

    it("takes priority over the path slug", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=bob", pathname: "/resume/carol" })),
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });
  });

  describe("path-based slugs", () => {
    it("resolves /resume/<slug>", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/john-smith" }))).toEqual({
        mode: "shared-resume",
        slug: "john-smith",
      });
    });

    it("resolves /resume alone as the 'resume' slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("tolerates a trailing slash", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("normalizes underscores and .mdx suffix in path slugs", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("returns editor mode for unrelated paths", () => {
      expect(resolveAppRoute(loc({ pathname: "/blog/post" }))).toEqual({ mode: "editor" });
    });
  });
});
