import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor mode when nothing matches", () => {
      expect(resolveAppRoute(loc({}))).toEqual({ mode: "editor" });
    });

    it("returns editor mode for unrelated path/search/hash", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/about", search: "?foo=bar", hash: "#/foo/bar" }))
      ).toEqual({ mode: "editor" });
    });
  });

  describe("slug normalisation", () => {
    it("trims, lower-cases and strips a trailing .mdx", () => {
      expect(resolveAppRoute(loc({ hash: "#Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("turns underscores and whitespace runs into single dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#foo_bar   baz" }))).toEqual({
        mode: "shared-resume",
        slug: "foo-bar-baz",
      });
    });

    it("drops characters outside a-z, 0-9 and -", () => {
      expect(resolveAppRoute(loc({ hash: "#Al!ce@2023" }))).toEqual({
        mode: "shared-resume",
        slug: "alce2023",
      });
    });

    it("collapses repeated dashes and trims leading/trailing dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#--alice--bob--" }))).toEqual({
        mode: "shared-resume",
        slug: "alice-bob",
      });
    });
  });

  describe("hash resolution", () => {
    it("uses a single segment as the slug (#alice)", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("handles leading/trailing slashes (#/alice/)", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("uses the second segment when the first is 'resume' (#/resume/alice)", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing for two+ segments when the first isn't 'resume'", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/foo/bar", pathname: "/", search: "" }))
      ).toEqual({ mode: "editor" });
    });

    it("yields nothing for an empty hash after trimming", () => {
      expect(resolveAppRoute(loc({ hash: "#///" }))).toEqual({ mode: "editor" });
    });

    it("drops empty segments produced by normalisation", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("takes priority over path and query", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#hash-slug", pathname: "/resume/path-slug", search: "?resume=query-slug" })
        )
      ).toEqual({ mode: "shared-resume", slug: "hash-slug" });
    });
  });

  describe("path resolution", () => {
    it("yields nothing for root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({ mode: "editor" });
    });

    it("gives slug 'resume' when the last segment is 'resume'", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("gives the slug after 'resume' (/resume/alice)", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("finds 'resume' even when preceded by other segments (/app/resume/alice)", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing for extra trailing segments (/resume/alice/extra)", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice/extra" }))).toEqual({
        mode: "editor",
      });
    });

    it("only applies when query has no resume slug", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/alice", search: "?foo=bar" }))
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });
  });

  describe("query resolution", () => {
    it("yields nothing when resume param is absent", () => {
      expect(resolveAppRoute(loc({ search: "?foo=bar" }))).toEqual({ mode: "editor" });
    });

    it("yields nothing when resume param is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({ mode: "editor" });
    });

    it("gives slug 'resume' for value '1'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("gives slug 'resume' for value 'true'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("gives slug 'resume' for value 'shared'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("gives the normalised value otherwise (?resume=Bob)", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual({
        mode: "shared-resume",
        slug: "bob",
      });
    });

    it("is used when path yields nothing", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/", search: "?resume=alice" }))
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });

    it("path takes priority over query per resolution order", () => {
      expect(
        resolveAppRoute(
          loc({ pathname: "/resume/path-slug", search: "?resume=query-slug" })
        )
      ).toEqual({ mode: "shared-resume", slug: "path-slug" });
    });
  });
});
