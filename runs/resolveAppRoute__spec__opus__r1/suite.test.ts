import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function route(parts: Partial<LocationLike>) {
  return resolveAppRoute({ pathname: "/", search: "", hash: "", ...parts });
}

const editor = { mode: "editor" };
const shared = (slug: string) => ({ mode: "shared-resume", slug });

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor for an empty location", () => {
      expect(route({})).toEqual(editor);
      expect(route({ pathname: "", search: "", hash: "" })).toEqual(editor);
    });

    it("returns editor for unrelated paths, queries and hashes", () => {
      expect(route({ pathname: "/settings", search: "?tab=1", hash: "" })).toEqual(editor);
    });
  });

  describe("slug normalisation", () => {
    it.each([
      ["Jane_Doe.mdx", "jane-doe"],
      ["  Alice  ", "alice"],
      ["ALICE", "alice"],
      ["file.MDX", "file"],
      ["jane   doe", "jane-doe"],
      ["jane\tdoe", "jane-doe"],
      ["a__b", "a-b"],
      ["a _ b", "a-b"],
      ["a---b", "a-b"],
      ["a_-_b", "a-b"],
      ["-alice-", "alice"],
      ["__alice__", "alice"],
      ["jane.doe", "janedoe"],
      ["o'brien!", "obrien"],
      ["Émile", "mile"],
      ["bob2024", "bob2024"],
      ["a!-!b", "a-b"],
    ])("normalises %j to %j", (raw, slug) => {
      expect(route({ search: `?resume=${encodeURIComponent(raw)}` })).toEqual(shared(slug));
    });

    it("only removes .mdx when it is trailing", () => {
      expect(route({ search: "?resume=a.mdxb" })).toEqual(shared("amdxb"));
    });

    it("trims before removing the .mdx suffix", () => {
      expect(route({ search: `?resume=${encodeURIComponent(" bob.mdx ")}` })).toEqual(shared("bob"));
    });

    it("normalises hash and path candidates too", () => {
      expect(route({ hash: "#Jane_Doe.mdx" })).toEqual(shared("jane-doe"));
      expect(route({ pathname: "/resume/Jane_Doe.mdx" })).toEqual(shared("jane-doe"));
    });
  });

  describe("hash", () => {
    it.each([
      ["#alice", "alice"],
      ["#/alice", "alice"],
      ["#/alice/", "alice"],
      ["#alice/", "alice"],
      ["#//alice//", "alice"],
      ["  #alice  ", "alice"],
      ["alice", "alice"],
      ["##alice", "alice"],
    ])("single segment %j yields %j", (hash, slug) => {
      expect(route({ hash })).toEqual(shared(slug));
    });

    it("treats a lone resume segment as the slug", () => {
      expect(route({ hash: "#resume" })).toEqual(shared("resume"));
      expect(route({ hash: "#/resume/" })).toEqual(shared("resume"));
    });

    it("uses the second segment when the first is resume", () => {
      expect(route({ hash: "#/resume/alice" })).toEqual(shared("alice"));
      expect(route({ hash: "#resume/alice" })).toEqual(shared("alice"));
      expect(route({ hash: "#/Resume/Alice/" })).toEqual(shared("alice"));
    });

    it("ignores segments after the second when the first is resume", () => {
      expect(route({ hash: "#/resume/alice/extra" })).toEqual(shared("alice"));
    });

    it("yields nothing for multiple segments not starting with resume", () => {
      expect(route({ hash: "#/foo/bar" })).toEqual(editor);
      expect(route({ hash: "#/alice/resume" })).toEqual(editor);
    });

    it("drops segments that normalise to empty", () => {
      expect(route({ hash: "#/!!!/alice" })).toEqual(shared("alice"));
      expect(route({ hash: "#/resume/!!!/alice" })).toEqual(shared("alice"));
      expect(route({ hash: "#/foo/___" })).toEqual(shared("foo"));
    });

    it("yields nothing for empty or slash-only hashes", () => {
      expect(route({ hash: "#" })).toEqual(editor);
      expect(route({ hash: "#/" })).toEqual(editor);
      expect(route({ hash: "#///" })).toEqual(editor);
      expect(route({ hash: "   " })).toEqual(editor);
      expect(route({ hash: "#!!!" })).toEqual(editor);
    });
  });

  describe("path", () => {
    it.each([
      ["/resume/alice", "alice"],
      ["/app/resume/alice", "alice"],
      ["/a/b/resume/alice", "alice"],
      ["/resume/alice/", "alice"],
      ["//resume//alice", "alice"],
      ["/Resume/Alice", "alice"],
      ["resume/alice", "alice"],
    ])("%j yields %j", (pathname, slug) => {
      expect(route({ pathname })).toEqual(shared(slug));
    });

    it("yields resume when the last segment is resume", () => {
      expect(route({ pathname: "/resume" })).toEqual(shared("resume"));
      expect(route({ pathname: "/resume/" })).toEqual(shared("resume"));
      expect(route({ pathname: "/app/resume" })).toEqual(shared("resume"));
      expect(route({ pathname: "/resume/resume" })).toEqual(shared("resume"));
      expect(route({ pathname: "/RESUME.mdx" })).toEqual(shared("resume"));
    });

    it("drops segments that normalise to empty", () => {
      expect(route({ pathname: "/resume/!!!" })).toEqual(shared("resume"));
      expect(route({ pathname: "/resume/%%%/alice" })).toEqual(shared("alice"));
    });

    it.each(["/", "", "/alice", "/app/alice", "/resume/alice/extra", "/resumes/alice", "/alice/resume-x"])(
      "%j yields nothing",
      (pathname) => {
        expect(route({ pathname })).toEqual(editor);
      },
    );
  });

  describe("query", () => {
    it("uses the normalised resume parameter as the slug", () => {
      expect(route({ search: "?resume=Bob" })).toEqual(shared("bob"));
      expect(route({ search: "?foo=1&resume=Jane_Doe.mdx" })).toEqual(shared("jane-doe"));
    });

    it("decodes the parameter like URLSearchParams", () => {
      expect(route({ search: "?resume=Jane+Doe" })).toEqual(shared("jane-doe"));
      expect(route({ search: "?resume=Jane%20Doe" })).toEqual(shared("jane-doe"));
      expect(route({ search: "resume=bob" })).toEqual(shared("bob"));
    });

    it.each(["1", "true", "shared", "TRUE", " Shared ", "shared.mdx"])(
      "maps %j to the resume slug",
      (value) => {
        expect(route({ search: `?resume=${encodeURIComponent(value)}` })).toEqual(shared("resume"));
      },
    );

    it("maps a value that normalises to empty to the resume slug", () => {
      expect(route({ search: "?resume=!!!" })).toEqual(shared("resume"));
      expect(route({ search: "?resume=%20%20" })).toEqual(shared("resume"));
    });

    it("yields nothing when the parameter is absent or empty", () => {
      expect(route({ search: "" })).toEqual(editor);
      expect(route({ search: "?" })).toEqual(editor);
      expect(route({ search: "?other=bob" })).toEqual(editor);
      expect(route({ search: "?resume" })).toEqual(editor);
      expect(route({ search: "?resume=" })).toEqual(editor);
    });

    it("does not treat near-miss values as the resume slug", () => {
      expect(route({ search: "?resume=10" })).toEqual(shared("10"));
      expect(route({ search: "?resume=truely" })).toEqual(shared("truely"));
    });
  });

  describe("precedence", () => {
    it("prefers the hash over the path and query", () => {
      expect(
        route({ pathname: "/resume/path", search: "?resume=query", hash: "#hash" }),
      ).toEqual(shared("hash"));
    });

    it("prefers the path over the query", () => {
      expect(route({ pathname: "/resume/path", search: "?resume=query" })).toEqual(shared("path"));
    });

    it("falls through to the path when the hash yields nothing", () => {
      expect(route({ pathname: "/resume/path", hash: "#/foo/bar" })).toEqual(shared("path"));
      expect(route({ pathname: "/resume/path", hash: "#/" })).toEqual(shared("path"));
    });

    it("falls through to the query when hash and path yield nothing", () => {
      expect(
        route({ pathname: "/resume/a/b", search: "?resume=query", hash: "#x/y" }),
      ).toEqual(shared("query"));
    });

    it("returns editor when nothing yields a slug", () => {
      expect(route({ pathname: "/resume/a/b", search: "?resume=", hash: "#x/y" })).toEqual(editor);
    });
  });
});
