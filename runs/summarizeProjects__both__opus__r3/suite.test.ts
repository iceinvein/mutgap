import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function event(
  project: string,
  overrides: Partial<UsageEvent> = {},
): UsageEvent {
  return {
    source: "claude-code",
    project,
    sessionId: "s",
    filePath: "f",
    eventKey: "k",
    timestamp: "2026-01-01T00:00:00Z",
    model: "m",
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

function displayOf(project: string): string {
  return summarizeProjects([event(project)])[0].displayProject;
}

describe("summarizeProjects", () => {
  it("returns [] for empty input", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("sums count, cost and tokens per project", () => {
    const result = summarizeProjects([
      event("/h/code/api", { estimatedCostUsd: 1, inputTokens: 10, outputTokens: 5 }),
      event("/h/code/api", { estimatedCostUsd: 2, inputTokens: 20, outputTokens: 7 }),
    ]);
    expect(result).toEqual([
      {
        project: "/h/code/api",
        displayProject: "api",
        rawProjects: ["/h/code/api"],
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 30,
        totalOutputTokens: 12,
      },
    ]);
  });

  it("only reads project, cost and input/output tokens", () => {
    const [summary] = summarizeProjects([
      event("p", { cacheReadTokens: 999, cacheWriteTokens: 999, totalTokens: 999, inputTokens: 1, outputTokens: 2 }),
    ]);
    expect(summary.totalInputTokens).toBe(1);
    expect(summary.totalOutputTokens).toBe(2);
  });

  describe("path normalisation", () => {
    it.each([
      ["/h/code/api/api", "api"],
      ["/h/code/acme/web", "acme/web"],
      ["/h/code/api", "api"],
      ["//h//code//acme//web//", "acme/web"],
      // markers are tried in order: workspace before code
      ["/h/code/x/workspace/y", "y"],
      ["/h/workspace/x/code/y", "x/code/y"],
      ["/h/src/a/projects/b", "a/projects/b"],
      ["/h/projects/a/repos/b", "a/repos/b"],
      ["/h/repos/a/code/b", "a/code/b"],
      // last occurrence of a marker is used
      ["/code/a/code/b", "b"],
      // a marker that is the final segment does not count
      ["/h/code/x/code", "x/code"],
      ["/h/src/a/code", "a/code"],
      // no marker: last two segments
      ["/a/b/c/d", "c/d"],
      ["/single", "single"],
      ["/", "/"],
      ["///", "///"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayOf(raw)).toBe(expected);
    });
  });

  describe("dash normalisation", () => {
    it.each([
      ["-h-projects-my-app", "my-app"],
      ["-h-code-api-api", "api"],
      // collapse only when exactly two pieces remain after the marker
      ["-h-code-x-api-api", "x-api-api"],
      ["-h-code-api", "api"],
      ["--h--code--my--app--", "my-app"],
      ["-h-workspace-a-code-b", "a-code-b"],
      ["-code-a-code-b", "b"],
      ["-h-code-x-code", "h-code-x-code"],
      // no marker: all pieces joined
      ["-a-b-c", "a-b-c"],
      ["-a-a", "a"],
      ["-a-a-a", "a-a-a"],
      ["-", "-"],
      ["---", "---"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayOf(raw)).toBe(expected);
    });
  });

  it.each(["plain", "my/app", "C:\\code\\app", ""])(
    "keeps %j unchanged when it starts with neither / nor -",
    (raw) => {
      expect(displayOf(raw)).toBe(raw);
    },
  );

  it("merges raw identifiers with the same display name", () => {
    const result = summarizeProjects([
      event("/z/code/api", { estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
      event("-a-code-api", { estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
      event("/z/code/api", { estimatedCostUsd: 4, inputTokens: 4, outputTokens: 4 }),
      event("api", { estimatedCostUsd: 8, inputTokens: 8, outputTokens: 8 }),
    ]);
    expect(result).toEqual([
      {
        project: "/z/code/api",
        displayProject: "api",
        rawProjects: ["-a-code-api", "/z/code/api", "api"],
        events: 4,
        estimatedCostUsd: 15,
        totalInputTokens: 15,
        totalOutputTokens: 15,
      },
    ]);
  });

  it("uses the first raw identifier in input order as project, not the first sorted", () => {
    const [summary] = summarizeProjects([event("/z/code/api"), event("/a/code/api")]);
    expect(summary.project).toBe("/z/code/api");
    expect(summary.rawProjects).toEqual(["/a/code/api", "/z/code/api"]);
  });

  it("keeps different display names separate", () => {
    const result = summarizeProjects([event("/h/code/a"), event("/h/code/b")]);
    expect(result.map((s) => s.displayProject).sort()).toEqual(["a", "b"]);
  });

  describe("ordering", () => {
    it("sorts by cost descending", () => {
      const result = summarizeProjects([
        event("a", { estimatedCostUsd: 1 }),
        event("b", { estimatedCostUsd: 3 }),
        event("c", { estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["b", "c", "a"]);
    });

    it("breaks cost ties by event count descending", () => {
      const result = summarizeProjects([
        event("a", { estimatedCostUsd: 2 }),
        event("b", { estimatedCostUsd: 1 }),
        event("b", { estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["b", "a"]);
    });

    it("breaks remaining ties by displayProject ascending", () => {
      const result = summarizeProjects([
        event("c", { estimatedCostUsd: 1 }),
        event("a", { estimatedCostUsd: 1 }),
        event("b", { estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["a", "b", "c"]);
    });
  });
});
