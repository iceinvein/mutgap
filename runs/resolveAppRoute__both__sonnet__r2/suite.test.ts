import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

describe("resolveAppRoute", () => {
  describe("editor fallback", () => {
    it("returns editor for a bare root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({ mode: "editor" });
    });

    it("returns editor when nothing matches in hash, path or query", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/about", search: "", hash: "" }))
      ).toEqual({ mode: "editor" });
    });
  });

  describe("hash resolution", () => {
    it("takes a single segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("trims leading/trailing slashes around a single segment", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("takes the second segment as the slug when the first is 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing for two segments when the first isn't 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/app/alice" }))).toEqual({
        mode: "editor",
      });
    });

    it("yields nothing for an empty hash", () => {
      expect(resolveAppRoute(loc({ hash: "" }))).toEqual({ mode: "editor" });
    });

    it("yields nothing for a hash that is just '#' or slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ hash: "#///" }))).toEqual({ mode: "editor" });
    });

    it("normalises the hash slug (e.g. Jane_Doe.mdx -> jane-doe)", () => {
      expect(resolveAppRoute(loc({ hash: "#Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("drops empty segments produced by normalisation before counting them", () => {
      // "%$" normalises to empty and is dropped, leaving a single real segment.
      expect(resolveAppRoute(loc({ hash: "#/%$/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("takes priority over path and query", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#hashy", pathname: "/resume/pathy", search: "?resume=querty" })
        )
      ).toEqual({ mode: "shared-resume", slug: "hashy" });
    });
  });

  describe("path resolution", () => {
    it("resolves /resume/<slug>", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("resolves /app/resume/<slug> (resume need not be first)", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("uses the literal slug 'resume' when the last segment is 'resume'", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("yields nothing for extra trailing segments after the slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice/extra" }))).toEqual({
        mode: "editor",
      });
    });

    it("normalises the path slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });
  });

  describe("query resolution", () => {
    it("yields nothing when resume param is absent", () => {
      expect(resolveAppRoute(loc({ search: "?other=1" }))).toEqual({
        mode: "editor",
      });
    });

    it("yields nothing when resume param is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({
        mode: "editor",
      });
    });

    it("uses slug 'resume' for 1, true or shared (case-insensitive)", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
      expect(resolveAppRoute(loc({ search: "?resume=TRUE" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("uses the normalised value as slug otherwise", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual({
        mode: "shared-resume",
        slug: "bob",
      });
    });

    it("normalises Jane_Doe.mdx to jane-doe", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });
  });

  describe("priority between path and query", () => {
    it("prefers the path slug over the query slug when both are present", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/alice", search: "?resume=bob" }))
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });

    it("falls back to query when path yields nothing", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/", search: "?resume=bob" }))
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });
  });

  describe("slug normalisation", () => {
    it("collapses underscores/whitespace runs to a single dash", () => {
      expect(resolveAppRoute(loc({ hash: "#jane__ doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("drops disallowed characters", () => {
      expect(resolveAppRoute(loc({ hash: "#j@ne!doe?" }))).toEqual({
        mode: "shared-resume",
        slug: "jnedoe",
      });
    });

    it("collapses repeated dashes and trims leading/trailing dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#--jane---doe--" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("removes a trailing .mdx case-insensitively", () => {
      expect(resolveAppRoute(loc({ hash: "#Alice.MDX" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });
  });
});
