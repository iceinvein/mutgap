import { describe, expect, it } from "vitest";
import { resolveAppRoute, type LocationLike } from "./resolveAppRoute";

function loc(overrides: Partial<LocationLike> = {}): LocationLike {
  return { pathname: "/", search: "", hash: "", ...overrides };
}

const editor = { mode: "editor" } as const;
const shared = (slug: string) => ({ mode: "shared-resume", slug }) as const;

describe("resolveAppRoute", () => {
  describe("editor fallback", () => {
    it.each([
      ["root", loc()],
      ["empty location", loc({ pathname: "", search: "", hash: "" })],
      ["unrelated path", loc({ pathname: "/jane-doe" })],
      ["unrelated nested path", loc({ pathname: "/app/settings" })],
      ["bare hash", loc({ hash: "#" })],
      ["hash of only slashes", loc({ hash: "#///" })],
      ["unrelated query param", loc({ search: "?foo=bar" })],
      ["empty resume param", loc({ search: "?resume=" })],
      ["valueless resume param", loc({ search: "?resume" })],
    ])("returns editor for %s", (_name, location) => {
      expect(resolveAppRoute(location)).toEqual(editor);
    });
  });

  describe("hash routes", () => {
    it.each([
      ["#jane-doe", "jane-doe"],
      ["#/jane-doe", "jane-doe"],
      ["#/jane-doe/", "jane-doe"],
      ["jane-doe", "jane-doe"],
      ["  #jane-doe  ", "jane-doe"],
      ["#resume", "resume"],
      ["#/resume/", "resume"],
      ["#resume/jane-doe", "jane-doe"],
      ["#/resume/jane-doe", "jane-doe"],
      ["#/resume/jane-doe/extra", "jane-doe"],
      ["#/Resume/Jane_Doe.mdx", "jane-doe"],
    ])("resolves %j to slug %j", (hash, slug) => {
      expect(resolveAppRoute(loc({ hash }))).toEqual(shared(slug));
    });

    it("ignores segments that normalize to empty", () => {
      expect(resolveAppRoute(loc({ hash: "#/!!!/jane-doe" }))).toEqual(shared("jane-doe"));
    });

    it("returns editor for a multi-segment hash not prefixed with resume", () => {
      expect(resolveAppRoute(loc({ hash: "#/other/jane-doe" }))).toEqual(editor);
    });

    it("falls through to query and path when the hash is not a resume route", () => {
      expect(
        resolveAppRoute(loc({ hash: "#/other/jane-doe", search: "?resume=alice" })),
      ).toEqual(shared("alice"));
      expect(
        resolveAppRoute(loc({ hash: "#/other/jane-doe", pathname: "/resume/bob" })),
      ).toEqual(shared("bob"));
    });
  });

  describe("query routes", () => {
    it.each([
      ["?resume=jane-doe", "jane-doe"],
      ["?foo=1&resume=jane-doe", "jane-doe"],
      ["?resume=Jane%20Doe", "jane-doe"],
      ["?resume=jane_doe.mdx", "jane-doe"],
    ])("resolves %j to slug %j", (search, slug) => {
      expect(resolveAppRoute(loc({ search }))).toEqual(shared(slug));
    });

    it.each(["1", "true", "TRUE", "shared", "Shared", "!!!", "%20", "-"])(
      "treats ?resume=%s as the default resume",
      (value) => {
        expect(resolveAppRoute(loc({ search: `?resume=${value}` }))).toEqual(shared("resume"));
      },
    );

    it("uses the first resume param when repeated", () => {
      expect(resolveAppRoute(loc({ search: "?resume=alice&resume=bob" }))).toEqual(
        shared("alice"),
      );
    });

    it("falls through to the path when the resume param is empty", () => {
      expect(resolveAppRoute(loc({ search: "?resume=", pathname: "/resume/bob" }))).toEqual(
        shared("bob"),
      );
    });
  });

  describe("path routes", () => {
    it.each([
      ["/resume", "resume"],
      ["/resume/", "resume"],
      ["/Resume", "resume"],
      ["/app/resume", "resume"],
      ["/resume/jane-doe", "jane-doe"],
      ["/resume/jane-doe/", "jane-doe"],
      ["/app/resume/jane-doe", "jane-doe"],
      ["//resume//jane-doe", "jane-doe"],
      ["/resume/Jane_Doe.mdx", "jane-doe"],
      ["  /resume/jane-doe  ", "jane-doe"],
    ])("resolves %j to slug %j", (pathname, slug) => {
      expect(resolveAppRoute(loc({ pathname }))).toEqual(shared(slug));
    });

    it.each(["/resume/jane-doe/extra", "/jane-doe/resume-x", "/resumes/jane-doe"])(
      "returns editor for %j",
      (pathname) => {
        expect(resolveAppRoute(loc({ pathname }))).toEqual(editor);
      },
    );
  });

  describe("precedence", () => {
    it("prefers hash over query and path", () => {
      expect(
        resolveAppRoute({ hash: "#hash-slug", search: "?resume=query-slug", pathname: "/resume/path-slug" }),
      ).toEqual(shared("hash-slug"));
    });

    it("prefers query over path", () => {
      expect(
        resolveAppRoute(loc({ search: "?resume=query-slug", pathname: "/resume/path-slug" })),
      ).toEqual(shared("query-slug"));
    });
  });

  describe("slug normalization", () => {
    it.each([
      ["JANE-DOE", "jane-doe"],
      ["jane.mdx", "jane"],
      ["jane.MDX", "jane"],
      ["jane.mdx.bak", "janemdxbak"],
      ["a.mdxb", "amdxb"],
      ["jane_doe", "jane-doe"],
      ["jane doe", "jane-doe"],
      ["jane \t_ doe", "jane-doe"],
      ["jane!@doe", "janedoe"],
      ["jané", "jan"],
      ["jane2024", "jane2024"],
      ["jane--doe", "jane-doe"],
      ["jane-!-doe", "jane-doe"],
      ["-jane-doe-", "jane-doe"],
      ["--jane--", "jane"],
      ["  jane  ", "jane"],
    ])("normalizes %j to %j", (raw, slug) => {
      const search = `?resume=${encodeURIComponent(raw)}`;
      expect(resolveAppRoute(loc({ search }))).toEqual(shared(slug));
    });
  });
});
