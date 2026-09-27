import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function event(
  project: string,
  overrides: Partial<UsageEvent> = {},
): UsageEvent {
  return {
    source: "claude-code",
    project,
    sessionId: "session",
    filePath: "/tmp/file.jsonl",
    eventKey: `${project}-${Math.random()}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "model",
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    totalTokens: 0,
    tokenBreakdownKnown: true,
    speed: "standard",
    estimatedCostUsd: 0,
    ...overrides,
  };
}

function displayNameOf(raw: string): string {
  const result = summarizeProjects([event(raw)]);
  expect(result).toHaveLength(1);
  return result[0].displayProject;
}

describe("summarizeProjects", () => {
  describe("aggregation", () => {
    it("returns an empty array for no events", () => {
      expect(summarizeProjects([])).toEqual([]);
    });

    it("summarises a single event", () => {
      const result = summarizeProjects([
        event("/h/code/api", {
          estimatedCostUsd: 1.5,
          inputTokens: 100,
          outputTokens: 20,
        }),
      ]);
      expect(result).toEqual([
        {
          project: "/h/code/api",
          displayProject: "api",
          rawProjects: ["/h/code/api"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 100,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("counts events and sums cost and tokens within a group", () => {
      const result = summarizeProjects([
        event("p", { estimatedCostUsd: 0.1, inputTokens: 10, outputTokens: 1 }),
        event("p", { estimatedCostUsd: 0.2, inputTokens: 20, outputTokens: 2 }),
        event("p", { estimatedCostUsd: 0.3, inputTokens: 30, outputTokens: 3 }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].events).toBe(3);
      expect(result[0].estimatedCostUsd).toBeCloseTo(0.6, 10);
      expect(result[0].totalInputTokens).toBe(60);
      expect(result[0].totalOutputTokens).toBe(6);
      expect(result[0].rawProjects).toEqual(["p"]);
    });

    it("keeps groups with different display names separate", () => {
      const result = summarizeProjects([
        event("alpha", { estimatedCostUsd: 2, inputTokens: 5 }),
        event("beta", { estimatedCostUsd: 1, inputTokens: 7 }),
        event("alpha", { estimatedCostUsd: 2, inputTokens: 5 }),
      ]);
      expect(result.map((s) => [s.displayProject, s.events, s.totalInputTokens])).toEqual([
        ["alpha", 2, 10],
        ["beta", 1, 7],
      ]);
    });

    it("only reads project, estimatedCostUsd, inputTokens and outputTokens", () => {
      const minimal = [
        { project: "x", estimatedCostUsd: 1, inputTokens: 2, outputTokens: 3 },
        { project: "x", estimatedCostUsd: 4, inputTokens: 5, outputTokens: 6 },
      ] as unknown as UsageEvent[];
      expect(summarizeProjects(minimal)).toEqual([
        {
          project: "x",
          displayProject: "x",
          rawProjects: ["x"],
          events: 2,
          estimatedCostUsd: 5,
          totalInputTokens: 7,
          totalOutputTokens: 9,
        },
      ]);
    });

    it("ignores totalTokens and cache tokens when summing", () => {
      const result = summarizeProjects([
        event("x", {
          inputTokens: 1,
          outputTokens: 2,
          cacheReadTokens: 1000,
          cacheWriteTokens: 1000,
          totalTokens: 5000,
        }),
      ]);
      expect(result[0].totalInputTokens).toBe(1);
      expect(result[0].totalOutputTokens).toBe(2);
    });

    it("does not mutate the input", () => {
      const input = [event("/h/code/b"), event("/h/code/a")];
      const snapshot = structuredClone(input);
      summarizeProjects(input);
      expect(input).toEqual(snapshot);
    });
  });

  describe("normalisation of identifiers not starting with / or -", () => {
    it.each([
      ["my-project"],
      ["api"],
      ["foo/code/bar"],
      ["C:\\Users\\me\\code\\api"],
      ["workspace"],
    ])("keeps %s as it is", (raw) => {
      expect(displayNameOf(raw)).toBe(raw);
    });
  });

  describe("normalisation of path identifiers", () => {
    it.each([
      ["/h/code/acme/web", "acme/web"],
      ["/h/code/api", "api"],
      ["/h/code/a/b/c", "a/b/c"],
      ["/h/workspace/proj", "proj"],
      ["/h/src/proj", "proj"],
      ["/h/projects/proj", "proj"],
      ["/h/repos/proj", "proj"],
    ])("uses the segments after the marker: %s -> %s", (raw, expected) => {
      expect(displayNameOf(raw)).toBe(expected);
    });

    it("collapses a repeated final pair after the marker", () => {
      expect(displayNameOf("/h/code/api/api")).toBe("api");
    });

    it("drops empty segments", () => {
      expect(displayNameOf("//h//code//acme///web/")).toBe("acme/web");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayNameOf("/h/code/old/code/new")).toBe("new");
    });

    it("tries markers in priority order rather than position order", () => {
      // code appears before src, but src is tried first
      expect(displayNameOf("/h/code/x/src/app")).toBe("app");
      // workspace beats src even though src appears later
      expect(displayNameOf("/h/workspace/a/src/b")).toBe("a/src/b");
      // projects beats repos and code
      expect(displayNameOf("/h/repos/r/code/c/projects/p")).toBe("p");
    });

    it("ignores a marker that is the final segment", () => {
      expect(displayNameOf("/h/projects/foo/src")).toBe("foo/src");
      expect(displayNameOf("/h/code/src")).toBe("src");
    });

    it("falls through when the last occurrence of a marker is final even if an earlier one is not", () => {
      // last "src" is final, so src does not count; code does
      expect(displayNameOf("/h/src/a/code/b/src")).toBe("b/src");
    });

    it("uses the last two segments when no marker counts", () => {
      expect(displayNameOf("/a/b/c")).toBe("b/c");
      expect(displayNameOf("/Users/me/dev/thing")).toBe("dev/thing");
      expect(displayNameOf("/h/me/code")).toBe("me/code");
    });

    it("uses the only segment when there is just one and no marker", () => {
      expect(displayNameOf("/thing")).toBe("thing");
    });

    it("keeps the identifier as it is when there are no segments", () => {
      expect(displayNameOf("/")).toBe("/");
      expect(displayNameOf("///")).toBe("///");
    });
  });

  describe("normalisation of dash identifiers", () => {
    it("uses the pieces after the marker joined with -", () => {
      expect(displayNameOf("-h-projects-my-app")).toBe("my-app");
      expect(displayNameOf("-Users-me-code-api")).toBe("api");
    });

    it("collapses a repeated pair only when exactly two pieces remain after the marker", () => {
      expect(displayNameOf("-h-code-api-api")).toBe("api");
      expect(displayNameOf("-h-code-x-api-api")).toBe("x-api-api");
    });

    it("drops empty pieces", () => {
      expect(displayNameOf("--h--code--my--app-")).toBe("my-app");
    });

    it("uses the last occurrence of a marker and marker priority", () => {
      expect(displayNameOf("-h-code-old-code-new")).toBe("new");
      expect(displayNameOf("-h-code-x-src-app")).toBe("app");
    });

    it("ignores a marker that is the final piece", () => {
      expect(displayNameOf("-h-repos-foo-src")).toBe("foo-src");
    });

    it("joins all pieces when no marker counts", () => {
      expect(displayNameOf("-foo-bar")).toBe("foo-bar");
      expect(displayNameOf("-a-b-c-")).toBe("a-b-c");
      expect(displayNameOf("-h-me-code")).toBe("h-me-code");
      expect(displayNameOf("-api-api-api")).toBe("api-api-api");
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(displayNameOf("-api-api")).toBe("api");
    });

    it("keeps the identifier as it is when no pieces are left", () => {
      expect(displayNameOf("-")).toBe("-");
      expect(displayNameOf("---")).toBe("---");
    });
  });

  describe("merging", () => {
    it("merges raw identifiers with the same display name", () => {
      const result = summarizeProjects([
        event("/home/b/src/api", { estimatedCostUsd: 1, inputTokens: 1, outputTokens: 10 }),
        event("/home/a/code/api", { estimatedCostUsd: 2, inputTokens: 2, outputTokens: 20 }),
        event("-home-c-repos-api", { estimatedCostUsd: 3, inputTokens: 3, outputTokens: 30 }),
        event("api", { estimatedCostUsd: 4, inputTokens: 4, outputTokens: 40 }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        displayProject: "api",
        events: 4,
        estimatedCostUsd: 10,
        totalInputTokens: 10,
        totalOutputTokens: 100,
      });
      expect(result[0].rawProjects).toEqual(
        ["/home/b/src/api", "/home/a/code/api", "-home-c-repos-api", "api"].sort(),
      );
    });

    it("lists each raw identifier once, sorted ascending", () => {
      const result = summarizeProjects([
        event("/home/c/code/api"),
        event("/home/a/code/api"),
        event("/home/c/code/api"),
        event("/home/b/code/api"),
        event("/home/a/code/api"),
      ]);
      expect(result[0].rawProjects).toEqual([
        "/home/a/code/api",
        "/home/b/code/api",
        "/home/c/code/api",
      ]);
      expect(result[0].events).toBe(5);
    });

    it("uses the first raw identifier seen in the input as project, not the first sorted", () => {
      const result = summarizeProjects([
        event("/home/zed/code/api"),
        event("/home/amy/code/api"),
        event("/home/zed/code/api"),
      ]);
      expect(result[0].project).toBe("/home/zed/code/api");
      expect(result[0].rawProjects[0]).toBe("/home/amy/code/api");
    });

    it("does not merge path and dash forms that normalise differently", () => {
      const result = summarizeProjects([
        event("/h/code/acme/web"),
        event("-h-code-acme-web"),
      ]);
      expect(result.map((s) => s.displayProject).sort()).toEqual(["acme-web", "acme/web"]);
    });
  });

  describe("ordering", () => {
    it("orders by total cost, highest first", () => {
      const result = summarizeProjects([
        event("low", { estimatedCostUsd: 1 }),
        event("high", { estimatedCostUsd: 5 }),
        event("mid", { estimatedCostUsd: 3 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["high", "mid", "low"]);
    });

    it("orders by summed cost, not per-event cost", () => {
      const result = summarizeProjects([
        event("single", { estimatedCostUsd: 3 }),
        event("many", { estimatedCostUsd: 2 }),
        event("many", { estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["many", "single"]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const result = summarizeProjects([
        event("aaa", { estimatedCostUsd: 2 }),
        event("zzz", { estimatedCostUsd: 1 }),
        event("zzz", { estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["zzz", "aaa"]);
    });

    it("breaks remaining ties by displayProject ascending", () => {
      const result = summarizeProjects([
        event("/h/code/cherry", { estimatedCostUsd: 1 }),
        event("/h/code/apple", { estimatedCostUsd: 1 }),
        event("/h/code/banana", { estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["apple", "banana", "cherry"]);
    });

    it("uses localeCompare for the name tie-break", () => {
      const names = ["b", "B", "a", "A", "é", "e"];
      const result = summarizeProjects(names.map((n) => event(n, { estimatedCostUsd: 1 })));
      expect(result.map((s) => s.displayProject)).toEqual(
        [...names].sort((x, y) => x.localeCompare(y)),
      );
    });

    it("tie-breaks on displayProject rather than raw project", () => {
      const result = summarizeProjects([
        event("/a/code/zeta", { estimatedCostUsd: 1 }),
        event("/z/code/alpha", { estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.project)).toEqual(["/z/code/alpha", "/a/code/zeta"]);
    });

    it("handles zero-cost groups", () => {
      const result = summarizeProjects([
        event("free-one"),
        event("paid", { estimatedCostUsd: 0.01 }),
        event("free-two"),
        event("free-two"),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["paid", "free-two", "free-one"]);
    });
  });
});
