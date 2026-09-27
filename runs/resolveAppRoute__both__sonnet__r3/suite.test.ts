import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./resolveAppRoute";

function loc(overrides: Partial<{ pathname: string; search: string; hash: string }> = {}) {
  return { pathname: "", search: "", hash: "", ...overrides };
}

describe("resolveAppRoute", () => {
  it("returns editor mode when nothing matches", () => {
    expect(resolveAppRoute(loc())).toEqual({ mode: "editor" });
    expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({ mode: "editor" });
  });

  describe("hash", () => {
    it("uses a single hash segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("trims leading and trailing slashes before splitting", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("uses the second segment when the first is 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("still uses the second segment when there are extra trailing segments", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice/extra" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing for two-plus segments when the first isn't 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/alice" }))).toEqual({ mode: "editor" });
    });

    it("yields nothing for an empty hash", () => {
      expect(resolveAppRoute(loc({ hash: "" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ hash: "#" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ hash: "#/" }))).toEqual({ mode: "editor" });
    });

    it("normalises the slug and trims surrounding whitespace", () => {
      expect(resolveAppRoute(loc({ hash: "  #/Jane_Doe.mdx/  " }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("takes precedence over path and query", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#hash-slug", pathname: "/resume/path-slug", search: "?resume=query-slug" }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "hash-slug" });
    });
  });

  describe("path", () => {
    it("yields 'resume' when the last segment is 'resume'", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("yields the last segment when the second-to-last is 'resume'", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
      expect(resolveAppRoute(loc({ pathname: "/app/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing for other paths", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ pathname: "/resume/alice/extra" }))).toEqual({
        mode: "editor",
      });
      expect(resolveAppRoute(loc({ pathname: "/about" }))).toEqual({ mode: "editor" });
    });

    it("normalises path segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });
  });

  describe("query", () => {
    it("yields nothing when the resume parameter is absent or empty", () => {
      expect(resolveAppRoute(loc({ search: "" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ search: "?other=1" }))).toEqual({ mode: "editor" });
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({ mode: "editor" });
    });

    it("uses the normalised value as the slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual({
        mode: "shared-resume",
        slug: "bob",
      });
    });

    it("yields 'resume' when the normalised value is empty, '1', 'true' or 'shared'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=!!!" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
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
    });

    it("takes precedence over the path", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/path-slug", search: "?resume=query-slug" })),
      ).toEqual({ mode: "shared-resume", slug: "query-slug" });
    });
  });

  describe("slug normalisation", () => {
    it("collapses underscores and whitespace runs into single dashes", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Jane__Doe" }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("drops characters outside a-z, 0-9 and dash", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Al!ce@123" }))).toEqual({
        mode: "shared-resume",
        slug: "alce123",
      });
    });

    it("collapses repeated dashes and trims leading/trailing dashes", () => {
      expect(resolveAppRoute(loc({ search: "?resume=-a---b-" }))).toEqual({
        mode: "shared-resume",
        slug: "a-b",
      });
    });
  });
});
