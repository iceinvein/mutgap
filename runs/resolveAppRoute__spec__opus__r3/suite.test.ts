import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(parts: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...parts };
}

const editor = { mode: "editor" };
const shared = (slug: string) => ({ mode: "shared-resume", slug });

describe("resolveAppRoute", () => {
  describe("editor fallback", () => {
    it("returns editor for the root URL with no hash or query", () => {
      expect(resolveAppRoute(loc())).toEqual(editor);
    });

    it("returns editor for an unrelated path and query", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/settings", search: "?tab=profile" })),
      ).toEqual(editor);
    });

    it("returns editor when all fields are empty strings", () => {
      expect(resolveAppRoute({ pathname: "", search: "", hash: "" })).toEqual(
        editor,
      );
    });
  });

  describe("slug normalisation", () => {
    it.each([
      ["Jane_Doe.mdx", "jane-doe"],
      ["  Alice  ", "alice"],
      ["BOB", "bob"],
      ["Jane.MDX", "jane"],
      ["jane__doe", "jane-doe"],
      ["jane doe", "jane-doe"],
      ["jane \t _ doe", "jane-doe"],
      ["jane---doe", "jane-doe"],
      ["jane - _ - doe", "jane-doe"],
      ["-jane-", "jane"],
      ["__jane__", "jane"],
      ["j@ne!doe", "jnedoe"],
      ["jane.doe", "janedoe"],
      ["Café", "caf"],
      ["agent007", "agent007"],
      ["a.mdx-b", "amdx-b"],
    ])("normalises %j to %j", (input, expected) => {
      expect(resolveAppRoute(loc({ hash: `#${input}` }))).toEqual(
        shared(expected),
      );
      expect(
        resolveAppRoute(
          loc({ search: `?${new URLSearchParams({ resume: input })}` }),
        ),
      ).toEqual(shared(expected));
    });
  });

  describe("hash", () => {
    it("uses a single segment as the slug", () => {
      expect(resolveAppRoute(loc({ hash: "#alice" }))).toEqual(shared("alice"));
    });

    it("ignores leading and trailing slashes", () => {
      expect(resolveAppRoute(loc({ hash: "#/alice/" }))).toEqual(
        shared("alice"),
      );
      expect(resolveAppRoute(loc({ hash: "#///alice///" }))).toEqual(
        shared("alice"),
      );
    });

    it("trims whitespace before stripping the leading #", () => {
      expect(resolveAppRoute(loc({ hash: "  #/alice/  " }))).toEqual(
        shared("alice"),
      );
    });

    it("works without a leading #", () => {
      expect(resolveAppRoute(loc({ hash: "alice" }))).toEqual(shared("alice"));
    });

    it("removes only one leading #; the rest is dropped by normalisation", () => {
      expect(resolveAppRoute(loc({ hash: "##alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("normalises the segment", () => {
      expect(resolveAppRoute(loc({ hash: "#/Jane_Doe.mdx" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("treats a lone resume segment as the slug 'resume'", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume" }))).toEqual(
        shared("resume"),
      );
    });

    it("uses the second segment when the first is resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("matches the resume prefix after normalisation", () => {
      expect(resolveAppRoute(loc({ hash: "#/RESUME/Alice" }))).toEqual(
        shared("alice"),
      );
      expect(resolveAppRoute(loc({ hash: "#/resume.mdx/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("ignores segments after the second when the first is resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/resume/alice/extra" }))).toEqual(
        shared("alice"),
      );
    });

    it("yields nothing for multiple segments not starting with resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/foo/alice" }))).toEqual(editor);
      expect(resolveAppRoute(loc({ hash: "#/app/resume/alice" }))).toEqual(
        editor,
      );
    });

    it("drops segments that normalise to empty before counting", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/alice" }))).toEqual(
        shared("alice"),
      );
      expect(resolveAppRoute(loc({ hash: "#/resume//alice" }))).toEqual(
        shared("alice"),
      );
      expect(resolveAppRoute(loc({ hash: "#/resume/!!!/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it.each(["", "#", "#/", "#//", "   ", "#/!!!/", "#/@/$/"])(
      "yields nothing for empty hash %j",
      (hash) => {
        expect(resolveAppRoute(loc({ hash }))).toEqual(editor);
      },
    );
  });

  describe("path", () => {
    it("uses the segment after resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it("allows a prefix before resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/app/resume/alice" }))).toEqual(
        shared("alice"),
      );
      expect(
        resolveAppRoute(loc({ pathname: "/a/b/c/resume/alice" })),
      ).toEqual(shared("alice"));
    });

    it("uses 'resume' as the slug when the last segment is resume", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume" }))).toEqual(
        shared("resume"),
      );
      expect(resolveAppRoute(loc({ pathname: "/app/resume" }))).toEqual(
        shared("resume"),
      );
      expect(resolveAppRoute(loc({ pathname: "/resume/" }))).toEqual(
        shared("resume"),
      );
    });

    it("prefers last-segment resume over second-to-last", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/resume" }))).toEqual(
        shared("resume"),
      );
      expect(resolveAppRoute(loc({ pathname: "/alice/resume" }))).toEqual(
        shared("resume"),
      );
    });

    it("normalises segments", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/Resume/Jane_Doe.mdx" })),
      ).toEqual(shared("jane-doe"));
    });

    it("ignores empty and repeated slashes", () => {
      expect(resolveAppRoute(loc({ pathname: "//resume//alice//" }))).toEqual(
        shared("alice"),
      );
    });

    it("drops segments that normalise to empty", () => {
      expect(resolveAppRoute(loc({ pathname: "/resume/!!!" }))).toEqual(
        shared("resume"),
      );
      expect(resolveAppRoute(loc({ pathname: "/resume/!!!/alice" }))).toEqual(
        shared("alice"),
      );
    });

    it.each(["/", "", "/alice", "/app/alice", "/resume/alice/extra", "/resumes/alice"])(
      "yields nothing for %j",
      (pathname) => {
        expect(resolveAppRoute(loc({ pathname }))).toEqual(editor);
      },
    );
  });

  describe("query", () => {
    it("uses the normalised resume parameter as the slug", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Bob" }))).toEqual(
        shared("bob"),
      );
    });

    it("decodes the parameter with URLSearchParams", () => {
      expect(resolveAppRoute(loc({ search: "?resume=Jane+Doe" }))).toEqual(
        shared("jane-doe"),
      );
      expect(resolveAppRoute(loc({ search: "?resume=Jane%5FDoe.mdx" }))).toEqual(
        shared("jane-doe"),
      );
    });

    it("accepts a search string without a leading ?", () => {
      expect(resolveAppRoute(loc({ search: "resume=bob" }))).toEqual(
        shared("bob"),
      );
    });

    it("reads resume among other parameters", () => {
      expect(
        resolveAppRoute(loc({ search: "?utm=x&resume=bob&y=z" })),
      ).toEqual(shared("bob"));
    });

    it("uses the first value when resume is repeated", () => {
      expect(resolveAppRoute(loc({ search: "?resume=a&resume=b" }))).toEqual(
        shared("a"),
      );
    });

    it.each(["1", "true", "TRUE", "shared", "Shared", " true ", "shared-", "1.mdx"])(
      "maps flag value %j to the slug 'resume'",
      (value) => {
        expect(
          resolveAppRoute(
            loc({ search: `?${new URLSearchParams({ resume: value })}` }),
          ),
        ).toEqual(shared("resume"));
      },
    );

    it.each(["!!!", " ", "---", ".mdx"])(
      "maps value %j that normalises to empty to the slug 'resume'",
      (value) => {
        expect(
          resolveAppRoute(
            loc({ search: `?${new URLSearchParams({ resume: value })}` }),
          ),
        ).toEqual(shared("resume"));
      },
    );

    it("does not treat similar values as flags", () => {
      expect(resolveAppRoute(loc({ search: "?resume=yes" }))).toEqual(
        shared("yes"),
      );
      expect(resolveAppRoute(loc({ search: "?resume=10" }))).toEqual(
        shared("10"),
      );
      expect(resolveAppRoute(loc({ search: "?resume=sharedx" }))).toEqual(
        shared("sharedx"),
      );
    });

    it.each(["", "?", "?resume", "?resume=", "?other=bob", "?Resume=bob"])(
      "yields nothing for %j",
      (search) => {
        expect(resolveAppRoute(loc({ search }))).toEqual(editor);
      },
    );
  });

  describe("precedence", () => {
    it("hash wins over path and query", () => {
      expect(
        resolveAppRoute({
          hash: "#carol",
          pathname: "/resume/alice",
          search: "?resume=bob",
        }),
      ).toEqual(shared("carol"));
    });

    it("path wins over query", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/resume/alice", search: "?resume=bob" })),
      ).toEqual(shared("alice"));
    });

    it("falls through to path when the hash yields nothing", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/foo/bar", pathname: "/resume/alice" })),
      ).toEqual(shared("alice"));
      expect(
        resolveAppRoute(loc({ hash: "#/!!!/", pathname: "/resume/alice" })),
      ).toEqual(shared("alice"));
    });

    it("falls through to query when hash and path yield nothing", () => {
      expect(
        resolveAppRoute({
          hash: "#/foo/bar",
          pathname: "/resume/alice/extra",
          search: "?resume=bob",
        }),
      ).toEqual(shared("bob"));
    });

    it("a query flag loses to a path slug", () => {
      expect(
        resolveAppRoute(loc({ pathname: "/app/resume/alice", search: "?resume=1" })),
      ).toEqual(shared("alice"));
    });

    it("returns editor when every source yields nothing", () => {
      expect(
        resolveAppRoute({
          hash: "#/foo/bar",
          pathname: "/resume/alice/extra",
          search: "?resume=",
        }),
      ).toEqual(editor);
    });
  });
});
