import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./resolveAppRoute";

function route(parts: { pathname?: string; search?: string; hash?: string }) {
  return resolveAppRoute({ pathname: "/", search: "", hash: "", ...parts });
}

const shared = (slug: string) => ({ mode: "shared-resume", slug });
const editor = { mode: "editor" };

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor for an empty location", () => {
      expect(route({})).toEqual(editor);
    });

    it("returns editor for an unrelated path, query and hash", () => {
      expect(route({ pathname: "/docs", search: "?foo=bar", hash: "#a/b" })).toEqual(editor);
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
      ["jane  doe", "jane-doe"],
      ["jane _ doe", "jane-doe"],
      ["jane.doe!", "janedoe"],
      ["jane---doe", "jane-doe"],
      ["jane-_-doe", "jane-doe"],
      ["-jane-", "jane"],
      ["__jane__", "jane"],
      ["élodie", "lodie"],
      ["user42", "user42"],
    ])("normalises %j to %j", (input, expected) => {
      expect(route({ search: `?resume=${encodeURIComponent(input)}` })).toEqual(shared(expected));
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
      ["#/resume/alice/extra", "alice"],
      ["#/Resume/Alice", "alice"],
      ["#resume", "resume"],
      ["#/!!!/alice", "alice"],
      ["#/alice//", "alice"],
    ])("%j yields slug %j", (hash, slug) => {
      expect(route({ hash })).toEqual(shared(slug));
    });

    it.each([["#"], [""], ["#/"], ["#///"], ["#!!!"], ["#/other/alice"], ["#a/b/c"]])(
      "%j yields nothing",
      (hash) => {
        expect(route({ hash })).toEqual(editor);
      },
    );

    it("removes only one leading #, leaving the rest to normalisation", () => {
      // "##alice" -> "#alice" -> normalised to "alice" as a single segment
      expect(route({ hash: "##alice" })).toEqual(shared("alice"));
      // "#/#/alice" -> "#/alice" -> segments ["", "alice"] -> ["alice"]
      expect(route({ hash: "#/#/alice" })).toEqual(shared("alice"));
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
      ["/resume/!!!/alice", "alice"],
      ["/alice/resume", "resume"],
      ["/resume/resume", "resume"],
    ])("%j yields slug %j", (pathname, slug) => {
      expect(route({ pathname })).toEqual(shared(slug));
    });

    it.each([["/"], [""], ["/alice"], ["/resume/alice/extra"], ["/resumes/alice"], ["/app"]])(
      "%j yields nothing",
      (pathname) => {
        expect(route({ pathname })).toEqual(editor);
      },
    );
  });

  describe("query", () => {
    it.each([
      ["?resume=Bob", "bob"],
      ["?resume=Jane_Doe.mdx", "jane-doe"],
      ["?resume=jane%20doe", "jane-doe"],
      ["?resume=jane+doe", "jane-doe"],
      ["?other=1&resume=bob", "bob"],
      ["?resume=bob&resume=carol", "bob"],
      ["resume=bob", "bob"],
    ])("%j yields slug %j", (search, slug) => {
      expect(route({ search })).toEqual(shared(slug));
    });

    it.each([
      ["?resume=1", "resume"],
      ["?resume=true", "resume"],
      ["?resume=TRUE", "resume"],
      ["?resume=shared", "resume"],
      ["?resume=Shared", "resume"],
      ["?resume=!!!", "resume"],
      ["?resume=%20%20", "resume"],
      ["?resume=---", "resume"],
    ])("%j yields the generic slug %j", (search, slug) => {
      expect(route({ search })).toEqual(shared(slug));
    });

    it.each([["?resume="], ["?resume"], [""], ["?"], ["?resumes=bob"], ["?Resume=bob"]])(
      "%j yields nothing",
      (search) => {
        expect(route({ search })).toEqual(editor);
      },
    );

    it("does not treat values that merely contain a flag word as the generic slug", () => {
      expect(route({ search: "?resume=10" })).toEqual(shared("10"));
      expect(route({ search: "?resume=untrue" })).toEqual(shared("untrue"));
    });
  });

  describe("precedence", () => {
    it("prefers the hash over the path and query", () => {
      expect(
        route({ hash: "#alice", pathname: "/resume/bob", search: "?resume=carol" }),
      ).toEqual(shared("alice"));
    });

    it("prefers the path over the query", () => {
      expect(route({ pathname: "/resume/bob", search: "?resume=carol" })).toEqual(shared("bob"));
    });

    it("prefers a bare /resume path over the query", () => {
      expect(route({ pathname: "/resume", search: "?resume=carol" })).toEqual(shared("resume"));
    });

    it("falls through to the path when the hash yields nothing", () => {
      expect(route({ hash: "#/other/alice", pathname: "/resume/bob" })).toEqual(shared("bob"));
    });

    it("falls through to the query when the hash and path yield nothing", () => {
      expect(route({ hash: "#a/b", pathname: "/resume/x/y", search: "?resume=carol" })).toEqual(
        shared("carol"),
      );
    });
  });
});
