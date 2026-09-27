import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function event(
  project: string,
  overrides: Partial<Pick<UsageEvent, "estimatedCostUsd" | "inputTokens" | "outputTokens">> = {},
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
  const [summary] = summarizeProjects([event(project)]);
  return summary.displayProject;
}

describe("summarizeProjects", () => {
  it("returns [] for empty input", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("sums counts, cost and tokens per project", () => {
    const result = summarizeProjects([
      event("/h/code/api", { estimatedCostUsd: 1.5, inputTokens: 10, outputTokens: 20 }),
      event("/h/code/api", { estimatedCostUsd: 2.5, inputTokens: 5, outputTokens: 7 }),
    ]);
    expect(result).toEqual([
      {
        project: "/h/code/api",
        displayProject: "api",
        rawProjects: ["/h/code/api"],
        events: 2,
        estimatedCostUsd: 4,
        totalInputTokens: 15,
        totalOutputTokens: 27,
      },
    ]);
  });

  describe("normalisation of path identifiers", () => {
    it("uses segments after a marker", () => {
      expect(displayOf("/h/code/acme/web")).toBe("acme/web");
    });

    it("collapses a repeated final pair", () => {
      expect(displayOf("/h/code/api/api")).toBe("api");
    });

    it("tries markers in priority order, not position order", () => {
      // "workspace" beats "code" even though "code" appears later
      expect(displayOf("/h/workspace/a/code/b")).toBe("a/code/b");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayOf("/src/a/src/b")).toBe("b");
    });

    it("ignores a marker that is the final segment", () => {
      expect(displayOf("/h/x/y/code")).toBe("y/code");
      // falls through to a lower-priority marker that does count
      expect(displayOf("/h/repos/app/src")).toBe("app/src");
    });

    it("drops empty segments", () => {
      expect(displayOf("//h//code//acme//web/")).toBe("acme/web");
    });

    it("falls back to the last two segments without a marker", () => {
      expect(displayOf("/home/me/stuff/thing")).toBe("stuff/thing");
      expect(displayOf("/single")).toBe("single");
    });

    it("keeps the identifier when no segments remain", () => {
      expect(displayOf("/")).toBe("/");
      expect(displayOf("///")).toBe("///");
    });
  });

  describe("normalisation of dash identifiers", () => {
    it("uses pieces after a marker joined with -", () => {
      expect(displayOf("-h-projects-my-app")).toBe("my-app");
    });

    it("collapses a repeated pair only when exactly two pieces remain", () => {
      expect(displayOf("-h-code-api-api")).toBe("api");
      expect(displayOf("-h-code-x-api-api")).toBe("x-api-api");
    });

    it("tries markers in priority order and uses the last occurrence", () => {
      expect(displayOf("-workspace-a-code-b")).toBe("a-code-b");
      expect(displayOf("-src-a-src-b")).toBe("b");
    });

    it("ignores a marker that is the final piece", () => {
      expect(displayOf("-h-x-code")).toBe("h-x-code");
    });

    it("drops empty pieces", () => {
      expect(displayOf("--h--code--my--app-")).toBe("my-app");
    });

    it("joins all pieces without a marker", () => {
      expect(displayOf("-home-me-thing")).toBe("home-me-thing");
    });

    it("collapses exactly two identical pieces without a marker", () => {
      expect(displayOf("-foo-foo")).toBe("foo");
      expect(displayOf("-foo-foo-foo")).toBe("foo-foo-foo");
    });

    it("keeps the identifier when no pieces remain", () => {
      expect(displayOf("-")).toBe("-");
      expect(displayOf("---")).toBe("---");
    });
  });

  it("keeps other identifiers as they are", () => {
    expect(displayOf("my-project")).toBe("my-project");
    expect(displayOf("code/acme/web")).toBe("code/acme/web");
    expect(displayOf("")).toBe("");
  });

  describe("merging", () => {
    it("merges raw identifiers with the same display name", () => {
      const result = summarizeProjects([
        event("/h/code/api/api", { estimatedCostUsd: 1, inputTokens: 1, outputTokens: 2 }),
        event("-h-code-api", { estimatedCostUsd: 2, inputTokens: 3, outputTokens: 4 }),
        event("api", { estimatedCostUsd: 3, inputTokens: 5, outputTokens: 6 }),
        event("-h-code-api", { estimatedCostUsd: 4, inputTokens: 7, outputTokens: 8 }),
      ]);
      expect(result).toEqual([
        {
          project: "/h/code/api/api",
          displayProject: "api",
          rawProjects: ["-h-code-api", "/h/code/api/api", "api"],
          events: 4,
          estimatedCostUsd: 10,
          totalInputTokens: 16,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("sets project to the first-seen raw identifier, not the first after sorting", () => {
      const [summary] = summarizeProjects([event("zzz"), event("/a/code/zzz"), event("zzz")]);
      expect(summary.rawProjects).toEqual(["/a/code/zzz", "zzz"]);
      expect(summary.project).toBe("zzz");
    });
  });

  describe("ordering", () => {
    it("orders by cost descending", () => {
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
      const result = summarizeProjects([event("c"), event("a"), event("b")]);
      expect(result.map((s) => s.displayProject)).toEqual(["a", "b", "c"]);
    });
  });
});
