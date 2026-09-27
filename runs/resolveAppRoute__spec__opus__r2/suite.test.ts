import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(parts: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...parts };
}

const editor = { mode: "editor" } as const;
const shared = (slug: string) => ({ mode: "shared-resume", slug }) as const;

describe("resolveAppRoute", () => {
  describe("default", () => {
    it("returns editor for an empty location", () => {
      expect(resolveAppRoute(loc())).toEqual(editor);
    });

    it("returns editor when nothing yields a slug", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/app/settings", search: "?tab=1", hash: "#/foo/bar" })),
      ).toEqual(editor);
    });
  });

  describe("slug normalisation", () => {
    // Each raw value is fed through every source so normalisation is checked
    // consistently for hash, path and query.
    const sources: Array<[string, (raw: string) => LocationLike]> = [
      ["hash", (raw) => loc({ hash: `#/resume/${raw}` })],
      ["path", (raw) => loc({ pathname: `/resume/${raw}` })],
      ["query", (raw) => loc({ search: `?${new URLSearchParams({ resume: raw })}` })],
    ];

    const cases: Array<[string, string]> = [
      ["Jane_Doe.mdx", "jane-doe"],
      ["ALICE", "alice"],
      ["  bob  ", "bob"],
      ["Jane.MDX", "jane"],
      ["jane.mdx  ", "jane"],
      ["jane  doe", "jane-doe"],
      ["jane\tdoe", "jane-doe"],
      ["jane___doe", "jane-doe"],
      ["jane_-_doe", "jane-doe"],
      ["jane---doe", "jane-doe"],
      ["-jane-doe-", "jane-doe"],
      ["__jane__", "jane"],
      ["j@ne!d.o.e", "jnedoe"],
      ["Émile Zola", "mile-zola"],
      ["file.mdx.bak", "filemdxbak"],
      ["agent007", "agent007"],
    ];

    for (const [source, build] of sources) {
      describe(`via ${source}`, () => {
        it.each(cases)("normalises %j to %j", (raw, slug) => {
          expect(resolveAppRoute(build(raw))).toEqual(shared(slug));
        });
      });
    }
  });

  describe("hash", () => {
    it.each([
      ["#alice", "alice"],
      ["#/alice/", "alice"],
      ["#/alice", "alice"],
      ["#alice/", "alice"],
      ["#//alice//", "alice"],
      ["  #/alice/  ", "alice"],
      ["#Jane_Doe.mdx", "jane-doe"],
      ["#resume", "resume"],
      ["#/resume/", "resume"],
    ])("single segment %j gives %j", (hash, slug) => {
      expect(resolveAppRoute(loc({ hash }))).toEqual(shared(slug));
    });

    it.each([
      ["#/resume/alice", "alice"],
      ["#resume/alice", "alice"],
      ["#/resume/alice/", "alice"],
      ["#/Resume/Jane_Doe.mdx", "jane-doe"],
      ["#/resume/alice/extra", "alice"],
      ["#/resume//alice", "alice"],
      ["#/resume/resume", "resume"],
    ])("resume segment followed by slug %j gives %j", (hash, slug) => {
      expect(resolveAppRoute(loc({ hash }))).toEqual(shared(slug));
    });

    it("drops segments that normalise to empty before counting", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/alice" }))).toEqual(shared("alice"));
      expect(resolveAppRoute(loc({ hash: "#/resume/!!!/alice" }))).toEqual(shared("alice"));
    });

    it("removes only one leading #", () => {
      // "##alice" -> "#alice", whose "#" is then dropped by normalisation.
      expect(resolveAppRoute(loc({ hash: "##alice" }))).toEqual(shared("alice"));
    });

    it.each(["", "#", "#/", "#///", "  ", "#!!!", "#/foo/bar", "#/alice/resume", "#/foo/resume/alice"])(
      "hash %j yields nothing",
      (hash) => {
        expect(resolveAppRoute(loc({ hash }))).toEqual(editor);
      },
    );
  });

  describe("path", () => {
    it.each([
      ["/resume", "resume"],
      ["/resume/", "resume"],
      ["/app/resume", "resume"],
      ["/Resume", "resume"],
      ["/resume/resume", "resume"],
      ["/alice/resume", "resume"],
    ])("last segment resume: %j gives %j", (pathname, slug) => {
      expect(resolveAppRoute(loc({ pathname }))).toEqual(shared(slug));
    });

    it.each([
      ["/resume/alice", "alice"],
      ["/resume/alice/", "alice"],
      ["/app/resume/alice", "alice"],
      ["/a/b/resume/alice", "alice"],
      ["//resume//alice//", "alice"],
      ["/RESUME/Jane_Doe.mdx", "jane-doe"],
    ])("second-to-last segment resume: %j gives %j", (pathname, slug) => {
      expect(resolveAppRoute(loc({ pathname }))).toEqual(shared(slug));
    });

    it("drops segments that normalise to empty", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/!!!" }))).toEqual(shared("resume"));
      expect(resolveAppRoute(loc({ pathname: "/resume/!!!/alice" }))).toEqual(shared("alice"));
    });

    it.each(["/", "", "/alice", "/app", "/resume/alice/extra", "/resumes/alice", "/foo/bar/baz"])(
      "path %j yields nothing",
      (pathname) => {
        expect(resolveAppRoute(loc({ pathname }))).toEqual(editor);
      },
    );
  });

  describe("query", () => {
    it.each([
      ["?resume=Bob", "bob"],
      ["?resume=Jane_Doe.mdx", "jane-doe"],
      ["?resume=Jane+Doe", "jane-doe"],
      ["?resume=Jane%20Doe", "jane-doe"],
      ["?foo=1&resume=alice&bar=2", "alice"],
      ["resume=alice", "alice"],
    ])("%j gives %j", (search, slug) => {
      expect(resolveAppRoute(loc({ search }))).toEqual(shared(slug));
    });

    it.each(["1", "true", "shared", "TRUE", "Shared", " true ", "shared.mdx"])(
      "flag value %j gives the resume slug",
      (value) => {
        const search = `?${new URLSearchParams({ resume: value })}`;
        expect(resolveAppRoute(loc({ search }))).toEqual(shared("resume"));
      },
    );

    it.each(["?resume=!!!", "?resume=%20%20", "?resume=---", "?resume=__"])(
      "non-empty value %j that normalises to empty gives the resume slug",
      (search) => {
        expect(resolveAppRoute(loc({ search }))).toEqual(shared("resume"));
      },
    );

    it.each(["", "?", "?resume=", "?resume", "?foo=bar", "?Resume=alice"])(
      "search %j yields nothing",
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

    it("falls through to path when the hash yields nothing", () => {
      expect(
        resolveAppRoute({ hash: "#/foo/bar", pathname: "/resume/bob", search: "?resume=carol" }),
      ).toEqual(shared("bob"));
    });

    it("falls through to query when hash and path yield nothing", () => {
      expect(
        resolveAppRoute({ hash: "#/foo/bar", pathname: "/resume/bob/extra", search: "?resume=carol" }),
      ).toEqual(shared("carol"));
    });

    it("a path yielding the resume slug still beats a query slug", () => {
      expect(
        resolveAppRoute({ hash: "", pathname: "/resume", search: "?resume=carol" }),
      ).toEqual(shared("resume"));
    });
  });
});
