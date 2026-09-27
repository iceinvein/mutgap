import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(overrides: Partial<LocationLike>): LocationLike {
  return { pathname: "/", search: "", hash: "", ...overrides };
}

const editor = { mode: "editor" as const };
function shared(slug: string) {
  return { mode: "shared-resume" as const, slug };
}

describe("resolveAppRoute", () => {
  describe("no signal anywhere", () => {
    it("returns editor mode for a bare root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/", search: "", hash: "" }))).toEqual(editor);
    });

    it("returns editor mode when nothing matches any source", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/about", search: "?foo=bar", hash: "#" }))
      ).toEqual(editor);
    });
  });

  describe("hash", () => {
    it("uses a single segment hash as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual(shared("alice"));
    });

    it("handles a single segment with leading/trailing slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual(shared("alice"));
    });

    it("uses the second segment as slug when the first is 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual(shared("alice"));
    });

    it("treats a lone 'resume' segment as the slug itself", () => {
      expect(resolveAppRoute(loc({ hash: "#resume" }))).toEqual(shared("resume"));
    });

    it("ignores extra segments beyond the second when the first is 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice/extra" }))).toEqual(shared("alice"));
    });

    it("yields nothing for two+ segments when the first isn't 'resume'", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/foo/bar", pathname: "/", search: "" }))
      ).toEqual(editor);
    });

    it("yields nothing for an empty hash", () => {
      expect(resolveAppRoute(loc({ hash: "#", pathname: "/", search: "" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ hash: "", pathname: "/", search: "" }))).toEqual(editor);
    });

    it("normalises the hash slug", () => {
      expect(resolveAppRoute(loc({ hash: "#Jane_Doe.mdx" }))).toEqual(shared("jane-doe"));
    });

    it("takes priority over path and query", () => {
      expect(
        resolveAppRoute(
          loc({ hash: "#alice", pathname: "/resume/bob", search: "?resume=carol" })
        )
      ).toEqual(shared("alice"));
    });
  });

  describe("path", () => {
    it("uses 'resume' as the slug when it's the last segment", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual(shared("resume"));
    });

    it("uses the last segment as slug when the second-to-last is 'resume'", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual(shared("alice"));
    });

    it("finds 'resume/<slug>' regardless of preceding path segments", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/alice" }))).toEqual(shared("alice"));
    });

    it("yields nothing for the root path", () => {
      expect(resolveAppRoute(loc({ pathname: "/" }))).toEqual(editor);
    });

    it("yields nothing when there are extra segments after the slug", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice/extra" }))).toEqual(editor);
    });

    it("normalises path segments and collapses empty ones from repeated slashes", () => {
      expect(resolveAppRoute(loc({ pathname: "//Resume//Alice.MDX//" }))).toEqual(
        shared("alice")
      );
    });

    it("is only consulted when the hash yields nothing", () => {
      expect(
        resolveAppRoute(loc({ hash: "#", pathname: "/resume/alice", search: "?resume=carol" }))
      ).toEqual(shared("alice"));
    });
  });

  describe("query", () => {
    it("yields nothing when the resume param is absent", () => {
      expect(resolveAppRoute(loc({ search: "?other=1" }))).toEqual(editor);
    });

    it("yields nothing when the resume param is present but empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=" }))).toEqual(editor);
    });

    it("uses 'resume' as slug for value '1'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=1" }))).toEqual(shared("resume"));
    });

    it("uses 'resume' as slug for value 'true' (case-insensitive)", () => {
      expect(resolveAppRoute(loc({ search: "?resume=true" }))).toEqual(shared("resume"));
      expect(resolveAppRoute(loc({ search: "?resume=TRUE" }))).toEqual(shared("resume"));
    });

    it("uses 'resume' as slug for value 'shared'", () => {
      expect(resolveAppRoute(loc({ search: "?resume=shared" }))).toEqual(shared("resume"));
    });

    it("uses 'resume' as slug when the value normalises to empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=%21%21%21" }))).toEqual(shared("resume"));
    });

    it("uses the normalised value as slug otherwise", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual(shared("bob"));
    });

    it("is only consulted when hash and path both yield nothing", () => {
      expect(
        resolveAppRoute(loc({ hash: "#", pathname: "/", search: "?resume=Bob" }))
      ).toEqual(shared("bob"));
    });
  });

  describe("slug normalisation", () => {
    it("trims, lower-cases and strips a trailing .mdx", () => {
      expect(resolveAppRoute(loc({ hash: "#  Alice.MDX  " }))).toEqual(shared("alice"));
    });

    it("turns runs of underscores or whitespace into a single dash", () => {
      expect(resolveAppRoute(loc({ hash: "#Jane   Doe" }))).toEqual(shared("jane-doe"));
    });

    it("drops characters outside a-z, 0-9 and dash", () => {
      expect(resolveAppRoute(loc({ hash: "#alice!!bob" }))).toEqual(shared("alicebob"));
    });

    it("collapses repeated dashes and trims leading/trailing dashes", () => {
      expect(resolveAppRoute(loc({ hash: "#a_-_b" }))).toEqual(shared("a-b"));
      expect(resolveAppRoute(loc({ hash: "#_alice_" }))).toEqual(shared("alice"));
    });
  });
});
