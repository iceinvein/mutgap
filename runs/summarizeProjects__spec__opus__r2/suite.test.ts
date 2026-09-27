import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    project: "/home/me/code/app",
    sessionId: `session-${counter}`,
    filePath: `/tmp/file-${counter}.jsonl`,
    eventKey: `key-${counter}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    messageId: `msg-${counter}`,
    model: "claude-sonnet-5",
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

function displayNameOf(project: string): string {
  const [summary] = summarizeProjects([makeEvent({ project })]);
  return summary.displayProject;
}

describe("summarizeProjects", () => {
  describe("aggregation", () => {
    it("returns an empty array for empty input", () => {
      expect(summarizeProjects([])).toEqual([]);
    });

    it("summarises a single event", () => {
      const result = summarizeProjects([
        makeEvent({
          project: "/home/me/code/acme/web",
          estimatedCostUsd: 1.5,
          inputTokens: 100,
          outputTokens: 20,
        }),
      ]);
      expect(result).toEqual([
        {
          project: "/home/me/code/acme/web",
          displayProject: "acme/web",
          rawProjects: ["/home/me/code/acme/web"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 100,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("sums cost, input and output tokens and counts events per group", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/h/code/app", estimatedCostUsd: 0.1, inputTokens: 10, outputTokens: 1 }),
        makeEvent({ project: "/h/code/app", estimatedCostUsd: 0.2, inputTokens: 20, outputTokens: 2 }),
        makeEvent({ project: "/h/code/app", estimatedCostUsd: 0.3, inputTokens: 30, outputTokens: 3 }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].events).toBe(3);
      expect(result[0].estimatedCostUsd).toBeCloseTo(0.6, 10);
      expect(result[0].totalInputTokens).toBe(60);
      expect(result[0].totalOutputTokens).toBe(6);
    });

    it("only reads project, cost and input/output tokens", () => {
      const result = summarizeProjects([
        makeEvent({
          project: "/h/code/app",
          estimatedCostUsd: 1,
          inputTokens: 5,
          outputTokens: 7,
          cacheReadTokens: 1000,
          cacheWriteTokens: 2000,
          totalTokens: 99999,
          webSearchRequests: 3,
          source: "cursor",
          speed: "fast",
        }),
      ]);
      expect(result[0]).toEqual({
        project: "/h/code/app",
        displayProject: "app",
        rawProjects: ["/h/code/app"],
        events: 1,
        estimatedCostUsd: 1,
        totalInputTokens: 5,
        totalOutputTokens: 7,
      });
    });

    it("keeps projects with different display names separate", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/h/code/one", estimatedCostUsd: 2 }),
        makeEvent({ project: "/h/code/two", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["one", "two"]);
      expect(result.map((s) => s.events)).toEqual([1, 1]);
    });

    it("does not mutate the input", () => {
      const events = [
        makeEvent({ project: "/z/code/api", estimatedCostUsd: 1 }),
        makeEvent({ project: "/a/code/api", estimatedCostUsd: 2 }),
      ];
      const snapshot = structuredClone(events);
      summarizeProjects(events);
      expect(events).toEqual(snapshot);
    });
  });

  describe("merging raw identifiers", () => {
    it("merges raw identifiers that normalise to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/home/me/code/acme/web", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 10 }),
        makeEvent({ project: "/home/you/src/acme/web", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 20 }),
        makeEvent({ project: "/home/me/code/acme/web", estimatedCostUsd: 4, inputTokens: 4, outputTokens: 40 }),
      ]);
      expect(result).toEqual([
        {
          project: "/home/me/code/acme/web",
          displayProject: "acme/web",
          rawProjects: ["/home/me/code/acme/web", "/home/you/src/acme/web"],
          events: 3,
          estimatedCostUsd: 7,
          totalInputTokens: 7,
          totalOutputTokens: 70,
        },
      ]);
    });

    it("merges path, dash and plain identifiers with the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/home/me/code/api" }),
        makeEvent({ project: "-home-me-code-api-api" }),
        makeEvent({ project: "api" }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].displayProject).toBe("api");
      expect(result[0].events).toBe(3);
      expect([...result[0].rawProjects].sort()).toEqual(
        ["-home-me-code-api-api", "/home/me/code/api", "api"].sort(),
      );
    });

    it("lists distinct raw identifiers only, sorted ascending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/zeta/code/api" }),
        makeEvent({ project: "/alpha/code/api" }),
        makeEvent({ project: "/zeta/code/api" }),
        makeEvent({ project: "/mid/code/api" }),
        makeEvent({ project: "/alpha/code/api" }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].rawProjects).toEqual([
        "/alpha/code/api",
        "/mid/code/api",
        "/zeta/code/api",
      ]);
      expect(result[0].events).toBe(5);
    });

    it("uses the first raw identifier seen in the input as project, not the first sorted", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/zeta/code/api" }),
        makeEvent({ project: "/alpha/code/api" }),
      ]);
      expect(result[0].project).toBe("/zeta/code/api");
      expect(result[0].rawProjects[0]).toBe("/alpha/code/api");
    });
  });

  describe("normalisation of path identifiers", () => {
    it.each([
      ["/h/code/acme/web", "acme/web"],
      ["/h/code/api/api", "api"],
      ["/home/me/workspace/app", "app"],
      ["/home/me/src/app", "app"],
      ["/home/me/projects/app", "app"],
      ["/home/me/repos/app", "app"],
      ["/home/me/code/app", "app"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayNameOf(raw)).toBe(expected);
    });

    it("drops empty segments", () => {
      expect(displayNameOf("//h//code//acme//web//")).toBe("acme/web");
    });

    it("tries markers in priority order rather than by position", () => {
      // workspace beats src even though src appears later
      expect(displayNameOf("/h/workspace/acme/src/web")).toBe("acme/src/web");
      // src beats projects
      expect(displayNameOf("/h/projects/x/src/y")).toBe("y");
      expect(displayNameOf("/h/src/x/projects/y")).toBe("x/projects/y");
      // projects beats repos, repos beats code
      expect(displayNameOf("/h/repos/x/projects/y")).toBe("y");
      expect(displayNameOf("/h/code/x/repos/y")).toBe("y");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayNameOf("/h/code/x/code/y")).toBe("y");
    });

    it("ignores a marker that is the final segment and falls back to the next marker", () => {
      expect(displayNameOf("/h/projects/app/src")).toBe("app/src");
    });

    it("ignores a final-segment last occurrence even if an earlier occurrence exists", () => {
      // last occurrence of "code" is final so it does not count; no other marker
      expect(displayNameOf("/h/code/app/code")).toBe("app/code");
    });

    it("gives the last two segments when no marker counts", () => {
      expect(displayNameOf("/a/b/c/d")).toBe("c/d");
      expect(displayNameOf("/home/me/code")).toBe("me/code");
    });

    it("gives the single segment when there is only one and no marker", () => {
      expect(displayNameOf("/solo")).toBe("solo");
    });

    it("keeps the identifier itself when the path has no segments", () => {
      expect(displayNameOf("/")).toBe("/");
      expect(displayNameOf("///")).toBe("///");
    });

    it("is case-sensitive about markers", () => {
      expect(displayNameOf("/h/Code/x/y")).toBe("x/y");
      expect(displayNameOf("/h/Code/app")).toBe("Code/app");
    });
  });

  describe("normalisation of dash identifiers", () => {
    it.each([
      ["-h-projects-my-app", "my-app"],
      ["-h-code-api-api", "api"],
      ["-home-me-workspace-app", "app"],
      ["-home-me-src-app", "app"],
      ["-home-me-repos-app", "app"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayNameOf(raw)).toBe(expected);
    });

    it("only collapses a repeated pair when exactly two pieces remain after the marker", () => {
      expect(displayNameOf("-h-code-x-api-api")).toBe("x-api-api");
    });

    it("drops empty pieces", () => {
      expect(displayNameOf("-h--code--my-app-")).toBe("my-app");
    });

    it("keeps the identifier as is when no pieces remain", () => {
      expect(displayNameOf("-")).toBe("-");
      expect(displayNameOf("---")).toBe("---");
    });

    it("tries markers in priority order and uses the last occurrence", () => {
      expect(displayNameOf("-h-workspace-a-src-b")).toBe("a-src-b");
      expect(displayNameOf("-h-code-a-code-b")).toBe("b");
    });

    it("ignores a marker that is the final piece", () => {
      expect(displayNameOf("-h-projects-app-src")).toBe("app-src");
    });

    it("joins all pieces with - when no marker counts", () => {
      expect(displayNameOf("-home-me-stuff")).toBe("home-me-stuff");
      expect(displayNameOf("-foo-bar")).toBe("foo-bar");
      expect(displayNameOf("-h-code")).toBe("h-code");
    });

    it("gives the single piece when there are exactly two identical pieces and no marker", () => {
      expect(displayNameOf("-api-api")).toBe("api");
      expect(displayNameOf("-api-api-api")).toBe("api-api-api");
    });
  });

  describe("normalisation of other identifiers", () => {
    it.each(["my-project", "code/foo/bar", "plain", "", "a-code-b"])(
      "keeps %j as is",
      (raw) => {
        expect(displayNameOf(raw)).toBe(raw);
      },
    );
  });

  describe("ordering", () => {
    it("orders by total cost, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "low", estimatedCostUsd: 1 }),
        makeEvent({ project: "high", estimatedCostUsd: 5 }),
        makeEvent({ project: "mid", estimatedCostUsd: 3 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["high", "mid", "low"]);
    });

    it("orders by summed cost rather than per-event cost", () => {
      const result = summarizeProjects([
        makeEvent({ project: "single", estimatedCostUsd: 3 }),
        makeEvent({ project: "many", estimatedCostUsd: 2 }),
        makeEvent({ project: "many", estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["many", "single"]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "aaa", estimatedCostUsd: 2 }),
        makeEvent({ project: "zzz", estimatedCostUsd: 1 }),
        makeEvent({ project: "zzz", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["zzz", "aaa"]);
    });

    it("breaks cost and event ties by displayProject ascending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "charlie", estimatedCostUsd: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 1 }),
        makeEvent({ project: "bravo", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "bravo", "charlie"]);
    });

    it("uses displayProject, not the raw identifier, for the final tie-break", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/a/code/zulu", estimatedCostUsd: 1 }),
        makeEvent({ project: "/z/code/alpha", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "zulu"]);
    });

    it("uses localeCompare for the final tie-break", () => {
      const names = ["b", "B", "a", "A"];
      const result = summarizeProjects(
        names.map((project) => makeEvent({ project, estimatedCostUsd: 1 })),
      );
      expect(result.map((s) => s.displayProject)).toEqual(
        [...names].sort((x, y) => x.localeCompare(y)),
      );
    });

    it("handles zero-cost projects", () => {
      const result = summarizeProjects([
        makeEvent({ project: "free" }),
        makeEvent({ project: "paid", estimatedCostUsd: 0.01 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["paid", "free"]);
    });
  });
});
