import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./resolveAppRoute";

function route(parts: { pathname?: string; search?: string; hash?: string }) {
  return resolveAppRoute({ pathname: "/", search: "", hash: "", ...parts });
}

const editor = { mode: "editor" };
const shared = (slug: string) => ({ mode: "shared-resume", slug });

describe("resolveAppRoute", () => {
  describe("editor fallback", () => {
    it("returns editor for an empty location", () => {
      expect(route({})).toEqual(editor);
      expect(resolveAppRoute({ pathname: "", search: "", hash: "" })).toEqual(editor);
    });

    it("returns editor for unrelated paths, queries and hashes", () => {
      expect(route({ pathname: "/about", search: "?foo=bar", hash: "#a/b" })).toEqual(editor);
    });
  });

  describe("slug normalisation", () => {
    it.each([
      ["Jane_Doe.mdx", "jane-doe"],
      ["  Alice  ", "alice"],
      ["ALICE", "alice"],
      ["alice.MDX", "alice"],
      ["jane__doe", "jane-doe"],
      ["jane   doe", "jane-doe"],
      ["jane_ _doe", "jane-doe"],
      ["jane.doe", "janedoe"],
      ["j@ne!doe", "jnedoe"],
      ["jane---doe", "jane-doe"],
      ["jane-_-doe", "jane-doe"],
      ["--jane-doe--", "jane-doe"],
      ["_jane_", "jane"],
      ["élan", "lan"],
      ["user42", "user42"],
    ])("normalises %j to %j", (input, expected) => {
      expect(route({ search: `?resume=${encodeURIComponent(input)}` })).toEqual(shared(expected));
    });

    it("only strips a trailing .mdx", () => {
      expect(route({ search: "?resume=a.mdx.b" })).toEqual(shared("amdxb"));
    });

    it("strips .mdx before removing other characters", () => {
      // ".mdx" is removed first, so the "x" does not survive
      expect(route({ hash: "#Bob.mdx" })).toEqual(shared("bob"));
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
      ["#resume/alice", "alice"],
      ["#/Resume/Alice/", "alice"],
      ["#/resume/alice/extra", "alice"],
      ["#/resume", "resume"],
      ["#/alice//", "alice"],
      ["#/!!!/alice", "alice"],
      ["#/resume/!!!/alice", "alice"],
    ])("%j yields slug %j", (hash, slug) => {
      expect(route({ hash })).toEqual(shared(slug));
    });

    it.each([["#"], [""], ["#/"], ["#///"], ["#!!!"], ["#/other/alice"], ["#/alice/bob"], ["##alice/bob"]])(
      "%j yields nothing",
      (hash) => {
        expect(route({ hash })).toEqual(editor);
      },
    );

    it("removes only one leading #", () => {
      // The second "#" is dropped by normalisation instead.
      expect(route({ hash: "##alice" })).toEqual(shared("alice"));
    });

    it("takes precedence over the path", () => {
      expect(route({ hash: "#alice", pathname: "/resume/bob" })).toEqual(shared("alice"));
    });

    it("takes precedence over the query", () => {
      expect(route({ hash: "#alice", search: "?resume=bob" })).toEqual(shared("alice"));
    });

    it("falls through to later sources when it yields nothing", () => {
      expect(route({ hash: "#/other/alice", pathname: "/resume/bob" })).toEqual(shared("bob"));
      expect(route({ hash: "#/other/alice", search: "?resume=carol" })).toEqual(shared("carol"));
    });
  });

  describe("path", () => {
    it.each([
      ["/resume/alice", "alice"],
      ["/resume/alice/", "alice"],
      ["/app/resume/alice", "alice"],
      ["/a/b/resume/alice", "alice"],
      ["/Resume/Jane_Doe.mdx", "jane-doe"],
      ["//resume//alice//", "alice"],
      ["/resume", "resume"],
      ["/resume/", "resume"],
      ["/app/resume", "resume"],
      ["/alice/resume", "resume"],
      ["/resume/resume", "resume"],
      ["/resume/alice/!!!", "alice"],
    ])("%j yields slug %j", (pathname, slug) => {
      expect(route({ pathname })).toEqual(shared(slug));
    });

    it.each([["/"], [""], ["/alice"], ["/resume/alice/extra"], ["/app/alice"], ["/resumes/alice"], ["/!!!"]])(
      "%j yields nothing",
      (pathname) => {
        expect(route({ pathname })).toEqual(editor);
      },
    );

    it("takes precedence over the query", () => {
      expect(route({ pathname: "/resume/alice", search: "?resume=bob" })).toEqual(shared("alice"));
    });

    it("gives the path's resume slug precedence over a query slug", () => {
      expect(route({ pathname: "/resume", search: "?resume=bob" })).toEqual(shared("resume"));
    });

    it("falls through to the query when it yields nothing", () => {
      expect(route({ pathname: "/resume/alice/extra", search: "?resume=bob" })).toEqual(shared("bob"));
    });
  });

  describe("query", () => {
    it.each([
      ["?resume=Bob", "bob"],
      ["resume=bob", "bob"],
      ["?foo=1&resume=Jane_Doe.mdx", "jane-doe"],
      ["?resume=jane%20doe", "jane-doe"],
      ["?resume=jane+doe", "jane-doe"],
      ["?resume=bob&resume=carol", "bob"],
      ["?resume=1", "resume"],
      ["?resume=true", "resume"],
      ["?resume=TRUE", "resume"],
      ["?resume=shared", "resume"],
      ["?resume=%20Shared%20", "resume"],
      ["?resume=!!!", "resume"],
      ["?resume=%20", "resume"],
      ["?resume=yes", "yes"],
      ["?resume=0", "0"],
      ["?resume=false", "false"],
      ["?resume=11", "11"],
    ])("%j yields slug %j", (search, slug) => {
      expect(route({ search })).toEqual(shared(slug));
    });

    it.each([[""], ["?"], ["?resume"], ["?resume="], ["?foo=bob"], ["?Resume=bob"], ["?resume=&resume=bob"]])(
      "%j yields nothing",
      (search) => {
        expect(route({ search })).toEqual(editor);
      },
    );
  });
});
