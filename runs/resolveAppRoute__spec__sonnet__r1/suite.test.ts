import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor when nothing matches", () => {
      expect(resolveAppRoute(loc({}))).toEqual({ mode: "editor" });
    });

    it("returns editor for an unrelated path", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/about" })),
      ).toEqual({ mode: "editor" });
    });
  });

  describe("hash", () => {
    it("uses a single hash segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("handles a single segment with leading and trailing slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("uses the second segment as the slug when the first is resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("yields nothing when two segments and the first isn't resume", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/app/alice", pathname: "/other" })),
      ).toEqual({ mode: "editor" });
    });

    it("falls through to path when the hash yields nothing", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#/app/alice", pathname: "/resume/bob" }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });

    it("normalises the hash slug (trim, case, whitespace/underscores)", () => {
      expect(resolveAppRoute(loc({ hash: "#  Jane_Doe.mdx  " }))).toEqual({
        mode: "shared-resume",
        slug: "jane-doe",
      });
    });

    it("takes priority over path and query", () => {
      expect(
        resolveAppRoute(
          loc({
            hash: "#carol",
            pathname: "/resume/bob",
            search: "?resume=dave",
          }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "carol" });
    });

    it("ignores an empty hash", () => {
      expect(
        resolveAppRoute(loc({ hash: "", pathname: "/resume/bob" })),
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });

    it("treats a hash of just slashes as empty and falls through", () => {
      expect(
        resolveAppRoute(loc({ hash: "#///", pathname: "/resume/bob" })),
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });
  });

  describe("path", () => {
    it("uses 'resume' as the slug when it is the last segment", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("uses the last segment as the slug when preceded by resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("still matches resume nested deeper in the path", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/app/resume/alice" })),
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });

    it("yields nothing for the root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual({
        mode: "editor",
      });
    });

    it("yields nothing when there's an extra segment after the slug", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/alice/extra" })),
      ).toEqual({ mode: "editor" });
    });

    it("normalises the path slug", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" })),
      ).toEqual({ mode: "shared-resume", slug: "jane-doe" });
    });

    it("takes priority over query", () => {
      expect(
        resolveAppRoute(
          loc({ pathname: "/resume/alice", search: "?resume=bob" }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "alice" });
    });
  });

  describe("query", () => {
    it("yields nothing when the resume param is absent", () => {
      expect(
        resolveAppRoute(loc({ search: "?other=1" })),
      ).toEqual({ mode: "editor" });
    });

    it("yields nothing when the resume param is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual({
        mode: "editor",
      });
    });

    it("uses 'resume' as the slug for value '1'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("uses 'resume' as the slug for value 'true'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("uses 'resume' as the slug for value 'shared'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual({
        mode: "shared-resume",
        slug: "resume",
      });
    });

    it("uses the normalised value as the slug otherwise", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual({
        mode: "shared-resume",
        slug: "bob",
      });
    });

    it("normalises a query slug with underscores and extension", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=Jane_Doe.mdx" })),
      ).toEqual({ mode: "shared-resume", slug: "jane-doe" });
    });

    it("is the last resort when hash and path yield nothing", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#/other/thing", pathname: "/about", search: "?resume=bob" }),
        ),
      ).toEqual({ mode: "shared-resume", slug: "bob" });
    });
  });

  describe("slug normalisation", () => {
    it("drops characters outside a-z, 0-9 and -", () => {
      expect(resolveAppRoute(loc({ hash: "#alice!@#$%^&*()smith" }))).toEqual(
        { mode: "shared-resume", slug: "alicesmith" },
      );
    });

    it("collapses repeated dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#alice---smith" }))).toEqual({
        mode: "shared-resume",
        slug: "alice-smith",
      });
    });

    it("trims leading and trailing dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#-alice-" }))).toEqual({
        mode: "shared-resume",
        slug: "alice",
      });
    });

    it("collapses whitespace runs into a single dash", () => {
      expect(resolveAppRoute(loc({ hash: "#alice   smith" }))).toEqual({
        mode: "shared-resume",
        slug: "alice-smith",
      });
    });

    it("only strips one trailing .mdx, dropping any other dots", () => {
      expect(resolveAppRoute(loc({ hash: "#alice.mdx.mdx" }))).toEqual({
        mode: "shared-resume",
        slug: "alicemdx",
      });
    });
  });
});
