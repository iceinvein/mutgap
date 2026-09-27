import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(partial: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...partial };
}

function editor() {
  return { mode: "editor" as const };
}

function shared(slug: string) {
  return { mode: "shared-resume" as const, slug };
}

describe("resolveAppRoute", () => {
  describe("no match anywhere", () => {
    it("returns editor for root path with no hash or query", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual(editor());
    });

    it("returns editor when nothing at all is set", () => {
      expect(
        resolveAppRoute(loc({ pathname: "", search: "", hash: "" })),
      ).toEqual(editor());
    });
  });

  describe("hash handling", () => {
    it("uses a single hash segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("handles a single segment with leading and trailing slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual(
        shared("alice"),
      );
    });

    it("uses the second segment as slug when the first is resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("normalises the hash slug candidate", () => {
      expect(resolveAppRoute(loc({ hash: "#Jane_Doe.mdx" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("normalises segments before checking for resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/Resume/Alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("yields nothing when two segments and the first is not resume", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/other/alice", pathname: "/" })),
      ).toEqual(editor());
    });

    it("uses the second segment as slug even with extra trailing segments", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#/resume/alice/extra", pathname: "/" }),
        ),
      ).toEqual(shared("alice"));
    });

    it("trims whitespace around the hash before processing", () => {
      expect(resolveAppRoute(loc({ hash: "  #alice  " }))).toEqual(
        shared("alice"),
      );
    });

    it("drops empty segments produced by repeated slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume//alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("falls through to path when the hash is empty", () => {
      expect(
        resolveAppRoute(loc({ hash: "", pathname: "/resume/bob" })),
      ).toEqual(shared("bob"));
    });

    it("falls through to path when the hash is just '#'", () => {
      expect(
        resolveAppRoute(loc({ hash: "#", pathname: "/resume/bob" })),
      ).toEqual(shared("bob"));
    });

    it("takes priority over path and query when it yields a slug", () => {
      expect(
        resolveAppRoute(
          loc({
            hash: "#alice",
            pathname: "/resume/bob",
            search: "?resume=carol",
          }),
        ),
      ).toEqual(shared("alice"));
    });
  });

  describe("path handling", () => {
    it("yields resume when the last segment is resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual(
        shared("resume"),
      );
    });

    it("yields resume when the last segment is resume even nested deeper", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume" }))).toEqual(
        shared("resume"),
      );
    });

    it("yields the last segment when the second-to-last is resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("yields the last segment when resume is nested deeper", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/app/resume/alice" })),
      ).toEqual(shared("alice"));
    });

    it("yields nothing for an unrelated path", () => {
      expect(resolveAppRoute(loc({ pathname: "/about" }))).toEqual(editor());
    });

    it("yields nothing when resume is followed by extra segments", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/alice/extra" })),
      ).toEqual(editor());
    });

    it("normalises the path slug candidate", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/Jane_Doe.mdx" })),
      ).toEqual(shared("jane-doe"));
    });

    it("falls through to query when the path yields nothing", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/about", search: "?resume=alice" })),
      ).toEqual(shared("alice"));
    });

    it("takes priority over query when it yields a slug", () => {
      expect(
        resolveAppRoute(
          loc({ pathname: "/resume/alice", search: "?resume=carol" }),
        ),
      ).toEqual(shared("alice"));
    });
  });

  describe("query handling", () => {
    it("yields nothing when the resume parameter is absent", () => {
      expect(resolveAppRoute(loc({ search: "?other=1" }))).toEqual(editor());
    });

    it("yields nothing when the resume parameter is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual(editor());
    });

    it("uses the normalised value as slug for an arbitrary value", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual(
        shared("bob"),
      );
    });

    it("yields resume for value '1'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual(
        shared("resume"),
      );
    });

    it("yields resume for value 'true'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual(
        shared("resume"),
      );
    });

    it("yields resume for value 'shared'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual(
        shared("resume"),
      );
    });

    it("yields resume when normalisation collapses the value to empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=___" }))).toEqual(
        shared("resume"),
      );
    });

    it("normalises an arbitrary query slug candidate", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=Jane_Doe.mdx" })),
      ).toEqual(shared("jane-doe"));
    });

    it("returns editor when hash, path and query all yield nothing", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "", pathname: "/about", search: "?other=1" }),
        ),
      ).toEqual(editor());
    });
  });

  describe("slug normalisation", () => {
    it("trims and lower-cases", () => {
      expect(resolveAppRoute(loc({ hash: "#  Alice  " }))).toEqual(
        shared("alice"),
      );
    });

    it("removes a trailing .mdx extension", () => {
      expect(resolveAppRoute(loc({ hash: "#alice.mdx" }))).toEqual(
        shared("alice"),
      );
    });

    it("turns runs of underscores and whitespace into single dashes", () => {
      expect(
        resolveAppRoute(loc({ hash: "#alice__ and bob" })),
      ).toEqual(shared("alice-and-bob"));
    });

    it("drops characters outside a-z, 0-9 and dash", () => {
      expect(resolveAppRoute(loc({ hash: "#al!ce@2023" }))).toEqual(
        shared("alce2023"),
      );
    });

    it("collapses repeated dashes into one", () => {
      expect(resolveAppRoute(loc({ hash: "#alice---bob" }))).toEqual(
        shared("alice-bob"),
      );
    });

    it("removes leading and trailing dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#-alice-" }))).toEqual(
        shared("alice"),
      );
    });
  });
});
