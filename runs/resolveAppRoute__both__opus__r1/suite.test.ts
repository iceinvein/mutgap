import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(parts: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...parts };
}

const editor = { mode: "editor" };
const shared = (slug: string) => ({ mode: "shared-resume", slug });

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor for an empty location", () => {
      expect(resolveAppRoute(loc({ pathname: "" }))).toEqual(editor);
    });

    it("returns editor for the root path", () => {
      expect(resolveAppRoute(loc())).toEqual(editor);
    });
  });

  describe("slug normalisation", () => {
    it.each([
      ["Jane_Doe.mdx", "jane-doe"],
      ["  Alice  ", "alice"],
      ["ALICE", "alice"],
      ["alice.MDX", "alice"],
      ["alice.mdx.mdx", "alicemdx"],
      ["jane__doe", "jane-doe"],
      ["jane   doe", "jane-doe"],
      ["jane_ _doe", "jane-doe"],
      ["jane--doe", "jane-doe"],
      ["jane.doe", "janedoe"],
      ["jöhn!@doe", "jhndoe"],
      ["-alice-", "alice"],
      ["__alice__", "alice"],
      ["user123", "user123"],
    ])("normalises %j to %j", (raw, expected) => {
      expect(resolveAppRoute(loc({ search: `?resume=${encodeURIComponent(raw)}` }))).toEqual(
        shared(expected),
      );
    });

    it("drops the .mdx suffix only when trailing", () => {
      expect(resolveAppRoute(loc({ hash: "#a.mdxb" }))).toEqual(shared("amdxb"));
    });
  });

  describe("hash", () => {
    it.each([
      ["#alice", "alice"],
      ["#/alice", "alice"],
      ["#/alice/", "alice"],
      ["#//alice//", "alice"],
      ["  #alice  ", "alice"],
      ["alice", "alice"],
      ["#Jane_Doe.mdx", "jane-doe"],
      ["#/resume/alice", "alice"],
      ["#resume/alice/", "alice"],
      ["#/resume/alice/extra", "alice"],
      ["#/Resume/Alice", "alice"],
      ["#/resume", "resume"],
      ["#/alice//", "alice"],
      ["#/!!!/alice", "alice"],
    ])("%j yields slug %j", (hash, slug) => {
      expect(resolveAppRoute(loc({ hash }))).toEqual(shared(slug));
    });

    it.each([
      "",
      "#",
      "#/",
      "#///",
      "   ",
      "#!!!",
      "#/other/alice",
      "#/app/resume/alice",
    ])("%j yields nothing", (hash) => {
      expect(resolveAppRoute(loc({ hash }))).toEqual(editor);
    });

    it("removes only one leading #", () => {
      // The second "#" is dropped by normalisation, not by the prefix strip.
      expect(resolveAppRoute(loc({ hash: "##alice" }))).toEqual(shared("alice"));
    });
  });

  describe("path", () => {
    it.each([
      ["/resume", "resume"],
      ["/resume/", "resume"],
      ["/app/resume", "resume"],
      ["/resume/alice", "alice"],
      ["/resume/alice/", "alice"],
      ["/app/resume/alice", "alice"],
      ["/Resume/Jane_Doe.mdx", "jane-doe"],
      ["//resume//alice", "alice"],
      ["/resume/resume", "resume"],
      ["/resume/!!!/alice", "alice"],
    ])("%j yields slug %j", (pathname, slug) => {
      expect(resolveAppRoute(loc({ pathname }))).toEqual(shared(slug));
    });

    it.each(["/", "", "/alice", "/app", "/resume/alice/extra", "/resumes/alice", "/!!!"])(
      "%j yields nothing",
      (pathname) => {
        expect(resolveAppRoute(loc({ pathname }))).toEqual(editor);
      },
    );
  });

  describe("query", () => {
    it.each([
      ["?resume=Bob", "bob"],
      ["resume=bob", "bob"],
      ["?foo=1&resume=Jane_Doe.mdx", "jane-doe"],
      ["?resume=jane+doe", "jane-doe"],
      ["?resume=jane%20doe", "jane-doe"],
      ["?resume=1", "resume"],
      ["?resume=true", "resume"],
      ["?resume=TRUE", "resume"],
      ["?resume=shared", "resume"],
      ["?resume=Shared.mdx", "resume"],
      ["?resume=!!!", "resume"],
      ["?resume=%20", "resume"],
      ["?resume=yes", "yes"],
      ["?resume=0", "0"],
      ["?resume=false", "false"],
      ["?resume=a&resume=b", "a"],
    ])("%j yields slug %j", (search, slug) => {
      expect(resolveAppRoute(loc({ search }))).toEqual(shared(slug));
    });

    it.each(["", "?", "?resume", "?resume=", "?foo=bar", "?Resume=bob"])(
      "%j yields nothing",
      (search) => {
        expect(resolveAppRoute(loc({ search }))).toEqual(editor);
      },
    );
  });

  describe("precedence", () => {
    it("hash wins over path and query", () => {
      expect(
        resolveAppRoute({ hash: "#alice", pathname: "/resume/bob", search: "?resume=carol" }),
      ).toEqual(shared("alice"));
    });

    it("path wins over query", () => {
      expect(
        resolveAppRoute({ hash: "", pathname: "/resume/bob", search: "?resume=carol" }),
      ).toEqual(shared("bob"));
    });

    it("path `resume` wins over a query slug", () => {
      expect(resolveAppRoute({ hash: "", pathname: "/resume", search: "?resume=carol" })).toEqual(
        shared("resume"),
      );
    });

    it("falls through to path when the hash yields nothing", () => {
      expect(resolveAppRoute({ hash: "#/other/alice", pathname: "/resume/bob", search: "" })).toEqual(
        shared("bob"),
      );
    });

    it("falls through to query when hash and path yield nothing", () => {
      expect(
        resolveAppRoute({ hash: "#/other/alice", pathname: "/resume/a/b", search: "?resume=carol" }),
      ).toEqual(shared("carol"));
    });

    it("returns editor when nothing yields a slug", () => {
      expect(
        resolveAppRoute({ hash: "#/x/y", pathname: "/resume/a/b", search: "?resume=" }),
      ).toEqual(editor);
    });
  });
});
